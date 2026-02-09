const path = require("node:path");
const { spawnSync } = require("node:child_process");

function main() {
  const redoclyCli = path.join(
    __dirname,
    "..",
    "node_modules",
    "@redocly",
    "cli",
    "bin",
    "cli.js"
  );
  const result = spawnSync(process.execPath, [redoclyCli, "lint", "openapi/openapi.yaml"], {
    encoding: "utf8",
  });
  if (result.error) {
    throw result.error;
  }

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  if ((result.status ?? 1) === 0) {
    return;
  }

  const combined = `${stdout}\n${stderr}`;
  const validated = combined.includes("Your API description is valid");
  const knownWindowsAssertion = combined.includes(
    "Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)"
  );
  if (validated && knownWindowsAssertion) {
    process.stderr.write(
      "Ignoring known Redocly Windows assertion after successful validation.\n"
    );
    return;
  }

  process.exit(result.status ?? 1);
}

main();
