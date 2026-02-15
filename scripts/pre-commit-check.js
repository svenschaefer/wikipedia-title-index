const { spawnSync } = require("node:child_process");

function getNpmExecPath() {
  if (process.env.npm_execpath) return process.env.npm_execpath;
  throw new Error("npm_execpath is not set; run this script via npm scripts.");
}

function runNpm(args) {
  const result = spawnSync(process.execPath, [getNpmExecPath(), ...args], {
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runNpm(["test"]);
runNpm(["run", "lint:openapi"]);
