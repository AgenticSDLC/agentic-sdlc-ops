const path = require("path");

const STACK_PRESETS = {
  "nextjs-pnpm": {
    label: "Next.js + pnpm",
    packageManager: "pnpm",
    scripts: {
      lint: "pnpm lint",
      build: "pnpm build",
      test: "pnpm test",
      smoke: "pnpm test:e2e",
    },
  },
  "nextjs-npm": {
    label: "Next.js + npm",
    packageManager: "npm",
    scripts: {
      lint: "npm run lint",
      build: "npm run build",
      test: "npm test",
      smoke: "npm run test:e2e",
    },
  },
  "nextjs-yarn": {
    label: "Next.js + yarn",
    packageManager: "yarn",
    scripts: {
      lint: "yarn lint",
      build: "yarn build",
      test: "yarn test",
      smoke: "yarn test:e2e",
    },
  },
  "react-vite-pnpm": {
    label: "React Vite + pnpm",
    packageManager: "pnpm",
    scripts: {
      lint: "pnpm lint",
      build: "pnpm build",
      test: "pnpm test",
      smoke: "pnpm test:e2e",
    },
  },
  "react-vite-npm": {
    label: "React Vite + npm",
    packageManager: "npm",
    scripts: {
      lint: "npm run lint",
      build: "npm run build",
      test: "npm test",
      smoke: "npm run test:e2e",
    },
  },
  "remix-pnpm": {
    label: "Remix + pnpm",
    packageManager: "pnpm",
    scripts: {
      lint: "pnpm lint",
      build: "pnpm build",
      test: "pnpm test",
      smoke: "pnpm test:e2e",
    },
  },
};

const APP_SHAPES = ["storefront", "saas-app", "marketing-site", "admin-console"];
const PLAN_VISIBILITY = "issue-comment";
const DEFAULT_TOPOLOGY = "combined";
const STANDARD_LABELS = [
  {
    name: "ready-for-build",
    color: "0e8a16",
    description: "Issue scope is ready for executable validation",
  },
  {
    name: "in-progress",
    color: "1d76db",
    description: "Implementation is authorized to begin",
  },
  {
    name: "in-review",
    color: "5319e7",
    description: "Implementation is complete enough for review",
  },
  {
    name: "done",
    color: "0e8a16",
    description: "Merged and complete",
  },
  {
    name: "topology:combined",
    color: "bfd4f2",
    description: "Combined planner-plus-executor execution path",
  },
  {
    name: "topology:split",
    color: "bfdadc",
    description: "Separate planner and executor roles are expected",
  },
  {
    name: "agent-builder",
    color: "c5def5",
    description: "Routes implementation work to a builder agent",
  },
  {
    name: "frontend",
    color: "fbca04",
    description: "Frontend or user-visible work",
  },
  {
    name: "backend",
    color: "d4c5f9",
    description: "Backend or server-side work",
  },
  {
    name: "full-stack",
    color: "f9d0c4",
    description: "Crosses frontend and backend boundaries",
  },
  {
    name: "config-only",
    color: "c2e0c6",
    description: "Configuration-only changes",
  },
  {
    name: "docs-only",
    color: "0075ca",
    description: "Documentation-only changes",
  },
  {
    name: "hold",
    color: "d93f0b",
    description: "Execution is paused pending human follow-up",
  },
  {
    name: "needs-human",
    color: "b60205",
    description: "Work requires human guidance before continuing",
  },
];

function getDefaultConfig(targetDir) {
  return {
    repositoryName: path.basename(targetDir),
    installMode: "new-repo",
    appShape: "storefront",
    stackPreset: "nextjs-pnpm",
    topology: DEFAULT_TOPOLOGY,
    runnerMode: "none-local",
    planVisibility: PLAN_VISIBILITY,
    issueSource: "github-issue",
    labelPack: "standard-with-routing",
    workflowScaffolding: "recommended",
    accelerators: ["task-classes", "gh-cli-sop", "issue-first-workflow", "env-manifest"],
    seedIssue: true,
  };
}

module.exports = {
  STACK_PRESETS,
  STANDARD_LABELS,
  APP_SHAPES,
  PLAN_VISIBILITY,
  DEFAULT_TOPOLOGY,
  getDefaultConfig,
};
