const { execSync } = require("node:child_process");

function main() {
  const output = execSync("git status --porcelain", { encoding: "utf8" }).trim();
  if (output.length > 0) {
    console.error("Release blocked: working tree is not clean.");
    console.error("Commit/stash/discard changes before releasing.");
    process.exit(1);
  }
}

main();
