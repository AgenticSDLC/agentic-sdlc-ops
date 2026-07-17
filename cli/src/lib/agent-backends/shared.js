const fs = require("fs");
const path = require("path");

const { extractMarkdownSections } = require("../policy");

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

function parseTargetPaths(issueBody) {
  const sections = extractMarkdownSections(issueBody || "");
  const rawTargets =
    sections.get("target files") || sections.get("target subsystem") || "";
  return rawTargets
    .split("\n")
    .map((line) => line.replace(/^\s*[-*]\s*/, "").trim().replace(/^`|`$/g, ""))
    .filter(Boolean);
}

function readTargetFileContents(rootDir, issueBody) {
  const currentFiles = [];
  for (const filePath of parseTargetPaths(issueBody)) {
    const abs = path.join(rootDir, filePath);
    if (fs.existsSync(abs)) {
      currentFiles.push({ path: filePath, content: fs.readFileSync(abs, "utf8") });
    }
  }
  return currentFiles;
}

module.exports = {
  getFrameworkHints,
  parseTargetPaths,
  readTargetFileContents,
};
