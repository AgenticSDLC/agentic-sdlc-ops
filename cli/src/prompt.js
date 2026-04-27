const readline = require("readline/promises");

async function confirm(message, defaultValue) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const suffix = defaultValue ? " [Y/n] " : " [y/N] ";
  const answer = (await rl.question(`${message}${suffix}`)).trim().toLowerCase();
  await rl.close();

  if (!answer) {
    return defaultValue;
  }

  return answer === "y" || answer === "yes";
}

module.exports = {
  confirm,
};
