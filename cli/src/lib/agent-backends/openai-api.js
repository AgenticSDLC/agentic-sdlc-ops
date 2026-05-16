const { extractMarkdownSections } = require("../policy");

const OPENAI_API_BASE = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4.1";
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

function buildPrompt(context, currentFiles) {
  const sections = extractMarkdownSections(context.issue.body || "");
  const requirements = sections.get("requirements") || "(none)";
  const acceptance = sections.get("acceptance criteria") || "(none)";
  const targetFiles = sections.get("target files") || sections.get("target subsystem") || "(none)";

  const frameworkHints = getFrameworkHints(context.config);
  const fileBlocks = (currentFiles || []).map(
    (f) => `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\``
  );

  return [
    "You are a coding agent implementing a narrow, scoped task.",
    "",
    `Repository: ${context.repoSlug}`,
    `Branch: ${context.branch}`,
    `Issue: #${context.issue.number} ${context.issue.title}`,
    "",
    ...(frameworkHints.length ? [...frameworkHints, ""] : []),
    ...(fileBlocks.length ? ["## Current File Contents", "", ...fileBlocks, ""] : []),
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
    "- NEVER remove existing functionality, components, or elements unless the issue explicitly requires it.",
    "",
    "## Output Schema",
    '{ "summary": string, "edits": [{ "path": string, "content": string }] }',
    "",
    "Return JSON only. No markdown fences. No explanation outside the JSON.",
  ].join("\n");
}

function isTransientFailure(error) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /\b429\b/.test(message) ||
    /\b5\d\d\b/.test(message) ||
    /fetch failed/i.test(message) ||
    /ECONNRESET/i.test(message) ||
    /ETIMEDOUT/i.test(message) ||
    /UND_ERR_HEADERS_TIMEOUT/i.test(message)
  );
}

function getOutputText(responseJson) {
  if (typeof responseJson?.output_text === "string" && responseJson.output_text.length > 0) {
    return responseJson.output_text;
  }

  for (const item of responseJson?.output ?? []) {
    if (item?.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  throw new Error("OpenAI Responses API did not return output_text");
}

async function callOpenAI(prompt, apiKey, model) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HEADERS_TIMEOUT_MS);

      const response = await fetch(`${OPENAI_API_BASE}/responses`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: prompt,
          text: {
            format: {
              type: "json_schema",
              name: "builder_edits",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  summary: { type: "string" },
                  edits: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        path: { type: "string" },
                        content: { type: "string" },
                      },
                      required: ["path", "content"],
                    },
                  },
                },
                required: ["summary", "edits"],
              },
            },
          },
        }),
      });

      clearTimeout(timeout);
      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(`OpenAI API returned ${response.status}: ${responseText.slice(0, 500)}`);
      }

      const responseJson = JSON.parse(responseText);
      const outputText = getOutputText(responseJson);
      return JSON.parse(outputText);
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

async function runOpenAIBackend(rootDir, context) {
  const fs = require("fs");
  const path = require("path");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      state: "blocked",
      summary: "OPENAI_API_KEY is not set. Export it and retry.",
      command: null,
      detail: null,
    };
  }

  const model = process.env.AGENTIC_MODEL || DEFAULT_MODEL;

  // Load current contents of target files for context
  const { extractMarkdownSections: extractSections } = require("../policy");
  const issueSections = extractSections(context.issue.body || "");
  const rawTargets = issueSections.get("target files") || issueSections.get("target subsystem") || "";
  const targetPaths = rawTargets.split("\n")
    .map((line) => line.replace(/^\s*[-*]\s*/, "").trim().replace(/^`|`$/g, ""))
    .filter(Boolean);

  const currentFiles = [];
  for (const filePath of targetPaths) {
    const abs = path.join(rootDir, filePath);
    if (fs.existsSync(abs)) {
      currentFiles.push({ path: filePath, content: fs.readFileSync(abs, "utf8") });
    }
  }

  const prompt = buildPrompt(context, currentFiles);

  let result;
  try {
    result = await callOpenAI(prompt, apiKey, model);
  } catch (error) {
    return {
      ok: false,
      state: "failed",
      summary: "Agent backend call failed.",
      command: `openai-api (${model})`,
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  if (!result.edits || !result.edits.length) {
    return {
      ok: false,
      state: "failed",
      summary: "Agent returned no edits.",
      command: `openai-api (${model})`,
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
    command: `openai-api (${model})`,
    detail: null,
  };
}

module.exports = {
  runOpenAIBackend,
  buildPrompt,
};
