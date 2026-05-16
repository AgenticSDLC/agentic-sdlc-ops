const { extractMarkdownSections } = require("../policy");

const ANTHROPIC_API_BASE = "https://api.anthropic.com/v1";
const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const MAX_ATTEMPTS = 3;
const RETRY_BASE_MS = 2000;
const HEADERS_TIMEOUT_MS = 120000;

function getFrameworkHints(config) {
  const preset = (config && config.stackPreset) || "";
  if (preset.startsWith("nextjs")) {
    return [
      "## Framework: Next.js",
      "- Use `import Link from 'next/link'` for internal navigation. Do NOT use raw `<a>` tags for internal routes.",
      "- Use `import Image from 'next/image'` instead of `<img>` tags.",
      "- App Router files live in `app/`. Pages are `page.tsx`, layouts are `layout.tsx`.",
      "- Client components must have `'use client'` at the top. Server components are the default.",
      "- Do not import from `next/router` — use `next/navigation` for App Router.",
    ];
  }
  if (preset.startsWith("react-vite")) {
    return [
      "## Framework: React + Vite",
      "- Use `react-router-dom` for routing if present.",
      "- Entry point is typically `src/main.tsx`.",
    ];
  }
  if (preset.startsWith("remix")) {
    return [
      "## Framework: Remix",
      "- Use `<Link>` from `@remix-run/react` for navigation.",
      "- Routes live in `app/routes/`.",
    ];
  }
  return [];
}

function buildPrompt(context) {
  const sections = extractMarkdownSections(context.issue.body || "");
  const requirements = sections.get("requirements") || "(none)";
  const acceptance = sections.get("acceptance criteria") || "(none)";
  const targetFiles = sections.get("target files") || sections.get("target subsystem") || "(none)";

  const frameworkHints = getFrameworkHints(context.config);

  return [
    "You are a coding agent implementing a narrow, scoped task.",
    "",
    `Repository: ${context.repoSlug}`,
    `Branch: ${context.branch}`,
    `Issue: #${context.issue.number} ${context.issue.title}`,
    "",
    ...(frameworkHints.length ? [...frameworkHints, ""] : []),
    "## Requirements",
    requirements,
    "",
    "## Acceptance Criteria",
    acceptance,
    "",
    "## Target Files",
    targetFiles,
    "",
    "## Rules",
    "- Only modify files listed in Target Files.",
    "- Each edit must contain the complete final file contents for that path.",
    "- Do not invent new files unless the requirements explicitly ask for them.",
    "- Keep the implementation as narrow as possible.",
    "- Do not broaden scope beyond the issue contract.",
    "- Do not use placeholder comments like '// ... unchanged ...' — output the full file.",
    "- Preserve existing formatting and project style.",
    "",
    "## Output",
    "Respond with ONLY a JSON object matching this schema (no markdown fences, no explanation):",
    '{ "summary": string, "edits": [{ "path": string, "content": string }] }',
  ].join("\n");
}

function isTransientFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /\b429\b/.test(message) ||
    /\b5\d\d\b/.test(message) ||
    /overloaded/i.test(message) ||
    /fetch failed/i.test(message) ||
    /ECONNRESET/i.test(message) ||
    /ETIMEDOUT/i.test(message)
  );
}

function extractJson(text) {
  const trimmed = text.trim();
  // Try direct parse first
  try {
    return JSON.parse(trimmed);
  } catch {
    // Try extracting from code fences
    const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) {
      return JSON.parse(fenceMatch[1].trim());
    }
    throw new Error("Could not parse JSON from model response");
  }
}

async function callAnthropic(prompt, apiKey, model) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HEADERS_TIMEOUT_MS);

      const response = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 16384,
          messages: [
            { role: "user", content: prompt },
          ],
        }),
      });

      clearTimeout(timeout);
      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`Anthropic API returned ${response.status}: ${responseText.slice(0, 500)}`);
      }

      const responseJson = JSON.parse(responseText);
      const textBlock = (responseJson.content || []).find((b) => b.type === "text");
      if (!textBlock || !textBlock.text) {
        throw new Error("Anthropic API did not return a text block");
      }

      return extractJson(textBlock.text);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS && isTransientFailure(error)) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_BASE_MS * attempt));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

async function runAnthropicBackend(rootDir, context) {
  const fs = require("fs");
  const path = require("path");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      state: "blocked",
      summary: "ANTHROPIC_API_KEY is not set. Export it and retry.",
      command: null,
      detail: null,
    };
  }

  const model = process.env.AGENTIC_MODEL || DEFAULT_MODEL;
  const prompt = buildPrompt(context);

  let result;
  try {
    result = await callAnthropic(prompt, apiKey, model);
  } catch (error) {
    return {
      ok: false,
      state: "failed",
      summary: "Agent backend call failed.",
      command: `anthropic-api (${model})`,
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  if (!result.edits || !result.edits.length) {
    return {
      ok: false,
      state: "failed",
      summary: "Agent returned no edits.",
      command: `anthropic-api (${model})`,
      detail: result.summary || "The model did not produce file changes.",
    };
  }

  for (const edit of result.edits) {
    const absolutePath = path.join(rootDir, edit.path);
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(absolutePath, edit.content, "utf8");
  }

  return {
    ok: true,
    state: "success",
    summary: result.summary || "Implementation complete.",
    command: `anthropic-api (${model})`,
    detail: null,
  };
}

module.exports = {
  runAnthropicBackend,
  buildPrompt,
};
