const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  makeTempWorkspace,
  writeLines,
  runNode,
  randomPort,
  removeTree,
} = require("./test-helpers");

const PROJECT_DIR = path.resolve(__dirname, "..");
const SERVICE_SCRIPT = path.join(PROJECT_DIR, "wikipedia-indexed.js");
const BUILD_SCRIPT = path.join(PROJECT_DIR, "build-title-index.js");

test("locks enforce build/service mutual exclusion", () => {
  const temp = makeTempWorkspace("locks");
  const dataDir = path.join(temp, "data");
  const runDir = path.join(dataDir, "run");
  fs.mkdirSync(runDir, { recursive: true });

  try {
    writeLines(path.join(dataDir, "raw", "enwiki-latest-all-titles.ns0.txt"), [
      "Alpha_Title",
    ]);

    fs.writeFileSync(path.join(runDir, "wikipedia-indexed.lock"), "{}\n");
    let result = runNode([BUILD_SCRIPT, "--file", "data/raw/enwiki-latest-all-titles.ns0.txt"], {
      cwd: temp,
      env: { ...process.env, WIKIPEDIA_INDEX_DATA_DIR: dataDir },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr + result.stdout, /service lock exists/i);
    fs.rmSync(path.join(runDir, "wikipedia-indexed.lock"), { force: true });

    result = runNode([BUILD_SCRIPT, "--file", "data/raw/enwiki-latest-all-titles.ns0.txt"], {
      cwd: temp,
      env: { ...process.env, WIKIPEDIA_INDEX_DATA_DIR: dataDir },
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);

    fs.writeFileSync(path.join(runDir, "wikipedia-build.lock"), "{}\n");
    result = runNode([SERVICE_SCRIPT], {
      cwd: temp,
      env: {
        ...process.env,
        WIKIPEDIA_INDEX_DATA_DIR: dataDir,
        SECS_WIKI_INDEX_PORT: `${randomPort()}`,
      },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr + result.stdout, /Build lock already exists/i);
    fs.rmSync(path.join(runDir, "wikipedia-build.lock"), { force: true });

    fs.writeFileSync(path.join(runDir, "wikipedia-indexed.lock"), "{}\n");
    result = runNode([SERVICE_SCRIPT], {
      cwd: temp,
      env: {
        ...process.env,
        WIKIPEDIA_INDEX_DATA_DIR: dataDir,
        SECS_WIKI_INDEX_PORT: `${randomPort()}`,
      },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr + result.stdout, /Lock exists \(missing pid\)/i);
  } finally {
    removeTree(temp);
  }
});
