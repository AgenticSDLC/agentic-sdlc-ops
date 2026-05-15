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
const CONTROL_PLANE_PROVIDER = "github";
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
const ISSUE_REQUIRED_SECTIONS = [
  "Context",
  "Requirements",
  "Acceptance Criteria",
  "Target Files",
];
const HOLD_LABELS = ["hold", "needs-human"];
const TOPOLOGY_LABELS = ["topology:combined", "topology:split"];
const DEFAULT_SCOPE_RULES = {
  subsystemAliases: {
    storefront: [
      "app",
      "pages",
      "src/app",
      "src/pages",
      "src/components",
      "components",
      "public",
    ],
    api: [
      "app/api",
      "pages/api",
      "src/app/api",
      "src/pages/api",
      "src/server",
      "server",
      "lib/api",
    ],
    checkout: [
      "app/checkout",
      "pages/checkout",
      "src/app/checkout",
      "src/pages/checkout",
      "components/checkout",
      "src/components/checkout",
    ],
    account: [
      "app/account",
      "pages/account",
      "src/app/account",
      "src/pages/account",
      "components/account",
      "src/components/account",
    ],
    admin: [
      "app/admin",
      "pages/admin",
      "src/app/admin",
      "src/pages/admin",
      "components/admin",
      "src/components/admin",
    ],
  },
  labelConstraints: {
    "docs-only": [
      "README.md",
      "docs",
      ".github",
      ".agentic",
    ],
    "config-only": [
      ".github",
      ".agentic",
      "package.json",
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
      "tsconfig.json",
      "tsconfig.tsbuildinfo",
      "next.config.js",
      "next.config.mjs",
      "vite.config.js",
      "vite.config.ts",
      "remix.config.js",
      "vercel.json",
      "amplify.yml",
      "serverless.yml",
      "template.yaml",
      "cdk.json",
      ".env.example",
    ],
  },
};

function getDefaultConfig(targetDir) {
  return {
    repositoryName: path.basename(targetDir),
    installMode: "new-repo",
    appShape: "storefront",
    stackPreset: "nextjs-pnpm",
    topology: DEFAULT_TOPOLOGY,
    controlPlaneProvider: CONTROL_PLANE_PROVIDER,
    runnerMode: "none-local",
    planVisibility: PLAN_VISIBILITY,
    issueSource: "github-issue",
    issueRequiredSections: ISSUE_REQUIRED_SECTIONS,
    labelPack: "standard-with-routing",
    holdLabels: HOLD_LABELS,
    topologyLabels: TOPOLOGY_LABELS,
    scopeRules: DEFAULT_SCOPE_RULES,
    standardLabels: STANDARD_LABELS,
    workflowScaffolding: "recommended",
    accelerators: ["task-classes", "gh-cli-sop", "issue-first-workflow", "env-manifest"],
    seedIssue: true,
  };
}

module.exports = {
  STACK_PRESETS,
  STANDARD_LABELS,
  ISSUE_REQUIRED_SECTIONS,
  HOLD_LABELS,
  TOPOLOGY_LABELS,
  DEFAULT_SCOPE_RULES,
  APP_SHAPES,
  PLAN_VISIBILITY,
  DEFAULT_TOPOLOGY,
  CONTROL_PLANE_PROVIDER,
  getDefaultConfig,
};
