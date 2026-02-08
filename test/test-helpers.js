const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const { spawn, spawnSync } = require("node:child_process");

function makeTempWorkspace(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `wiki-${prefix}-`));
}

function fixturePath(name) {
  return path.join(__dirname, "fixtures", name);
}

function copyFixture(name, destinationPath) {
  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.copyFileSync(fixturePath(name), destinationPath);
}

function writeLines(filePath, lines) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function gzipFile(inputPath, outputPath) {
  const content = fs.readFileSync(inputPath);
  fs.writeFileSync(outputPath, zlib.gzipSync(content));
}

function runNode(args, options = {}) {
  return spawnSync(process.execPath, args, {
    encoding: "utf8",
    timeout: 120_000,
    ...options,
  });
}

function startNode(args, options = {}) {
  return spawn(process.execPath, args, {
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  });
}

function randomPort() {
  return 35000 + Math.floor(Math.random() * 20000);
}

async function waitFor(url, timeoutMs = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function removeTree(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

module.exports = {
  makeTempWorkspace,
  fixturePath,
  copyFixture,
  writeLines,
  gzipFile,
  runNode,
  startNode,
  randomPort,
  waitFor,
  sleep,
  removeTree,
};
