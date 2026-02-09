const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  createQueryCache,
  getDbFingerprint,
  getEntryPath,
  getQueryCacheKey,
  getShardedEntryPath,
  clearQueryCache,
} = require("../src/lib/query-cache");
const { makeTempWorkspace, removeTree, sleep } = require("./test-helpers");

test("corrupted cache entry is ignored and removed", async () => {
  const temp = makeTempWorkspace("query-cache-corrupt");
  try {
    const dbPath = path.join(temp, "data", "index", "titles.db");
    const cacheDir = path.join(temp, "data", "cache");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, "db-v1");

    const config = {
      cacheDir,
      dbPath,
      cacheEnabled: true,
      cacheTtlSeconds: 86_400,
      cacheMaxEntries: 10_000,
    };
    const cache = createQueryCache(config, {
      validatePayload(value) {
        return Boolean(value && typeof value === "object" && typeof value.value === "string");
      },
    });
    const query = { sql: "SELECT 1", params: [], maxRows: 1 };
    const cachePath = getEntryPath(cacheDir, getDbFingerprint(dbPath), query);
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, "{broken json");

    assert.equal(cache.get(query), null);
    assert.equal(fs.existsSync(cachePath), false);

    cache.set(query, { value: "ok" });
    assert.deepEqual(cache.get(query), { value: "ok" });
  } finally {
    removeTree(temp);
  }
});

test("cache key changes after db fingerprint changes", async () => {
  const temp = makeTempWorkspace("query-cache-fingerprint");
  try {
    const dbPath = path.join(temp, "data", "index", "titles.db");
    const cacheDir = path.join(temp, "data", "cache");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, "db-v1");

    const config = {
      cacheDir,
      dbPath,
      cacheEnabled: true,
      cacheTtlSeconds: 86_400,
      cacheMaxEntries: 10_000,
    };
    const query = { sql: "SELECT 1", params: [], maxRows: 1 };
    const validate = (value) =>
      Boolean(value && typeof value === "object" && typeof value.value === "string");

    const cacheBefore = createQueryCache(config, { validatePayload: validate });
    cacheBefore.set(query, { value: "before" });
    assert.deepEqual(cacheBefore.get(query), { value: "before" });

    await sleep(5);
    fs.appendFileSync(dbPath, "-updated");

    const cacheAfter = createQueryCache(config, { validatePayload: validate });
    assert.equal(cacheAfter.get(query), null);
    cacheAfter.set(query, { value: "after" });
    assert.deepEqual(cacheAfter.get(query), { value: "after" });

    const entries = listJsonFiles(cacheDir);
    assert.equal(entries.length, 2);
  } finally {
    removeTree(temp);
  }
});

test("bucket cache format selects matching key in multi-entry file", () => {
  const temp = makeTempWorkspace("query-cache-bucket-hit");
  try {
    const dbPath = path.join(temp, "data", "index", "titles.db");
    const cacheDir = path.join(temp, "data", "cache");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, "db-v1");

    const config = {
      cacheDir,
      dbPath,
      cacheEnabled: true,
      cacheTtlSeconds: 86_400,
      cacheMaxEntries: 10_000,
    };
    const query = { sql: "SELECT 1", params: [], maxRows: 1 };
    const queryKey = getQueryCacheKey(getDbFingerprint(dbPath), query);
    const cachePath = getEntryPath(cacheDir, getDbFingerprint(dbPath), query);
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(
      cachePath,
      JSON.stringify({
        version: 2,
        entries: [
          { key: "other-key", payload: { value: "wrong" } },
          { key: queryKey, payload: { value: "correct" } },
        ],
      }),
      "utf8"
    );

    const cache = createQueryCache(config, {
      validatePayload(value) {
        return Boolean(value && typeof value === "object" && typeof value.value === "string");
      },
    });
    assert.deepEqual(cache.get(query), { value: "correct" });
  } finally {
    removeTree(temp);
  }
});

test("clearQueryCache removes all cache entries", () => {
  const temp = makeTempWorkspace("query-cache-clear");
  try {
    const cacheDir = path.join(temp, "data", "cache");
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(path.join(cacheDir, "one.json"), "{}");
    fs.writeFileSync(path.join(cacheDir, "two.json"), "{}");
    fs.writeFileSync(path.join(cacheDir, "ignore.tmp"), "");

    const removed = clearQueryCache(cacheDir);
    assert.equal(removed, 2);
    assert.equal(fs.existsSync(path.join(cacheDir, "one.json")), false);
    assert.equal(fs.existsSync(path.join(cacheDir, "two.json")), false);
    assert.equal(fs.existsSync(path.join(cacheDir, "ignore.tmp")), false);
  } finally {
    removeTree(temp);
  }
});

test("max entries eviction keeps newest cached entries", async () => {
  const temp = makeTempWorkspace("query-cache-eviction");
  try {
    const dbPath = path.join(temp, "data", "index", "titles.db");
    const cacheDir = path.join(temp, "data", "cache");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, "db-v1");

    const cache = createQueryCache(
      {
        cacheDir,
        dbPath,
        cacheEnabled: true,
        cacheTtlSeconds: 0,
        cacheMaxEntries: 2,
      },
      {
        validatePayload(value) {
          return Boolean(value && typeof value === "object" && typeof value.value === "string");
        },
      }
    );

    const q1 = { sql: "SELECT 1", params: [], maxRows: 1 };
    const q2 = { sql: "SELECT 2", params: [], maxRows: 1 };
    const q3 = { sql: "SELECT 3", params: [], maxRows: 1 };
    cache.set(q1, { value: "v1" });
    await sleep(5);
    cache.set(q2, { value: "v2" });
    await sleep(5);
    cache.set(q3, { value: "v3" });

    assert.equal(cache.get(q1), null);
    assert.deepEqual(cache.get(q2), { value: "v2" });
    assert.deepEqual(cache.get(q3), { value: "v3" });
    const entries = listJsonFiles(cacheDir);
    assert.equal(entries.length, 2);
  } finally {
    removeTree(temp);
  }
});

test("sharded path layout uses first two and next two hash characters", () => {
  const cacheDir = path.join("data", "cache");
  const hash = "e3b0c44298fc1c149afbf4c8996fb924";
  const entryPath = getShardedEntryPath(cacheDir, hash);
  assert.equal(entryPath, path.join("data", "cache", "e3", "b0", `${hash}.json`));
});

function listJsonFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  walk(root, files);
  return files;
}

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(fullPath);
    }
  }
}

test("ttl eviction removes stale cached entries", async () => {
  const temp = makeTempWorkspace("query-cache-ttl");
  try {
    const dbPath = path.join(temp, "data", "index", "titles.db");
    const cacheDir = path.join(temp, "data", "cache");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, "db-v1");

    const cache = createQueryCache(
      {
        cacheDir,
        dbPath,
        cacheEnabled: true,
        cacheTtlSeconds: 1,
        cacheMaxEntries: 0,
      },
      {
        validatePayload(value) {
          return Boolean(value && typeof value === "object" && typeof value.value === "string");
        },
      }
    );

    const q1 = { sql: "SELECT 1", params: [], maxRows: 1 };
    const q2 = { sql: "SELECT 2", params: [], maxRows: 1 };
    cache.set(q1, { value: "v1" });
    const q1Path = getEntryPath(cacheDir, getDbFingerprint(dbPath), q1);
    const staleEpochSeconds = Math.floor((Date.now() - 10_000) / 1000);
    fs.utimesSync(q1Path, staleEpochSeconds, staleEpochSeconds);

    cache.set(q2, { value: "v2" });

    assert.equal(cache.get(q1), null);
    assert.deepEqual(cache.get(q2), { value: "v2" });
  } finally {
    removeTree(temp);
  }
});

test("cache initialization failure degrades to no-op cache", () => {
  const temp = makeTempWorkspace("query-cache-noop");
  try {
    const dbPath = path.join(temp, "data", "index", "titles.db");
    const cacheDirAsFile = path.join(temp, "data", "cache");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, "db-v1");
    fs.writeFileSync(cacheDirAsFile, "not-a-directory");

    const cache = createQueryCache({
      cacheDir: cacheDirAsFile,
      dbPath,
      cacheEnabled: true,
      cacheTtlSeconds: 60,
      cacheMaxEntries: 10,
    });
    const query = { sql: "SELECT 1", params: [], maxRows: 1 };

    assert.equal(cache.get(query), null);
    assert.doesNotThrow(() => cache.set(query, { value: "ignored" }));
    assert.equal(cache.clear(), 0);
  } finally {
    removeTree(temp);
  }
});
