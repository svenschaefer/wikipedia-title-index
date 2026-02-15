const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function getNpmExecPath() {
  if (process.env.npm_execpath) return process.env.npm_execpath;
  throw new Error("npm_execpath is not set; run this script via npm scripts.");
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function runCapture(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
  return result.stdout.trim();
}

function main() {
  const root = process.cwd();
  const npmExecPath = getNpmExecPath();
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const tarball = `${pkg.name}-${pkg.version}.tgz`;
  const tarballPath = path.join(root, tarball);
  const installedBinJs = path.join(
    "node_modules",
    "wikipedia-title-index",
    "bin",
    "wikipedia-title-index.js"
  );

  run(process.execPath, [npmExecPath, "pack"], root);
  if (!fs.existsSync(tarballPath)) {
    throw new Error(`Tarball not found: ${tarballPath}`);
  }

  const smokeDir = fs.mkdtempSync(path.join(os.tmpdir(), "wti-smoke-"));
  try {
    run(process.execPath, [npmExecPath, "init", "-y"], smokeDir);
    run(process.execPath, [npmExecPath, "install", tarballPath], smokeDir);
    const tree = JSON.parse(
      runCapture(process.execPath, [npmExecPath, "ls", "wikipedia-title-index", "--json"], smokeDir)
    );
    const installedVersion = tree.dependencies?.["wikipedia-title-index"]?.version;
    if (installedVersion !== pkg.version) {
      throw new Error(`Installed version mismatch: expected ${pkg.version}, got ${installedVersion}`);
    }
    run(process.execPath, [installedBinJs, "--help"], smokeDir);
    run(process.execPath, [installedBinJs, "status"], smokeDir);
  } finally {
    fs.rmSync(smokeDir, { recursive: true, force: true });
    fs.rmSync(tarballPath, { force: true });
  }
}

main();
