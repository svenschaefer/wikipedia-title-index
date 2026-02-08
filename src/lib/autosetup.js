const fs = require("node:fs");
const { DatabaseSync } = require("node:sqlite");
const { SCHEMA_VERSION } = require("./constants");
const { acquireProcessLock } = require("./process-lock");
const { buildIndex } = require("../cli/build");

function getIndexState(config) {
  if (!fs.existsSync(config.dbPath)) {
    return { status: "needs_build", reason: "missing_db" };
  }
  if (!fs.existsSync(config.metadataPath)) {
    return { status: "needs_build", reason: "missing_metadata" };
  }

  let metadata;
  try {
    metadata = JSON.parse(fs.readFileSync(config.metadataPath, "utf8"));
  } catch {
    return { status: "incompatible", reason: "invalid_metadata" };
  }

  if (`${metadata.schema_version ?? ""}` !== SCHEMA_VERSION) {
    return { status: "incompatible", reason: "schema_version_mismatch" };
  }

  const db = new DatabaseSync(config.dbPath, { readOnly: true });
  try {
    const row = db
      .prepare(
        "SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='titles'"
      )
      .get();
    if (!row) {
      return { status: "incompatible", reason: "missing_titles_table" };
    }
  } catch {
    return { status: "incompatible", reason: "db_validation_failed" };
  } finally {
    db.close();
  }

  return { status: "ready", reason: null };
}

async function ensureIndexReady(config) {
  const state = getIndexState(config);
  if (state.status === "ready") {
    return state;
  }

  if (process.env.WIKIPEDIA_INDEX_AUTOSETUP === "0") {
    const error = new Error(
      `Index is not ready (${state.reason}) and auto-setup is disabled`
    );
    error.code = "AUTOSETUP_DISABLED";
    throw error;
  }

  if (fs.existsSync(config.buildLockPath)) {
    const error = new Error("Build lock already exists");
    error.code = "BUILD_LOCK_EXISTS";
    throw error;
  }

  const release = acquireProcessLock(config.buildLockPath, "wikipedia-build");
  try {
    await buildIndex({ skipLock: true });
  } finally {
    release();
  }

  return getIndexState(config);
}

module.exports = {
  getIndexState,
  ensureIndexReady,
};
