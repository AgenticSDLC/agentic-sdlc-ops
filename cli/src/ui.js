function color(code, text) {
  return `\u001b[${code}m${text}\u001b[0m`;
}

function colorState(state) {
  const palette = {
    pass: "1;32",
    ready: "1;32",
    "ready-local-only": "1;33",
    "ready-with-custom-verification": "1;33",
    warning: "1;33",
    "local-only": "1;33",
    blocked: "1;31",
    fail: "1;31",
    "blocked-missing-app": "1;31",
    "blocked-missing-repo": "1;31",
    "blocked-missing-verification": "1;31",
    "profile-mismatch": "1;35",
    "remediation-required": "1;35",
  };

  return color(palette[state] || "1;37", state);
}

function printSection(title) {
  console.log("");
  console.log(color("1;36", title));
  console.log(color("2;36", "-".repeat(title.length)));
}

function printKeyValue(label, value) {
  console.log(`${color("1;37", label)}: ${value}`);
}

function printState(label, state) {
  printKeyValue(label, colorState(state));
}

function printList(title, items) {
  printSection(title);
  for (const item of items) {
    console.log(`${color("2;37", "-")} ${item}`);
  }
}

function printPathList(label, items) {
  if (!items.length) {
    printKeyValue(label, color("2;37", "none"));
    return;
  }

  printKeyValue(label, "");
  for (const item of items) {
    console.log(`  ${color("2;37", "-")} ${item}`);
  }
}

function printFooter(message) {
  console.log("");
  console.log(color("1;34", "Next"));
  console.log(color("2;34", "----"));
  console.log(message);
}

module.exports = {
  color,
  colorState,
  printSection,
  printKeyValue,
  printState,
  printList,
  printPathList,
  printFooter,
};
