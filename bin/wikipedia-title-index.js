#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { buildIndex } = require("../build-title-index");
const { startServer } = require("../wikipedia-indexed");
const { getConfig } = require("../lib/paths");
const { getIndexState } = require("../lib/autosetup");

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printUsage();
    return;
  }

  if (command === "build") {
    await buildIndex(parseBuildArgs(args));
    return;
  }

  if (command === "serve") {
    await startServer();
    return;
  }

  if (command === "query") {
    const result = spawnSync(
      process.execPath,
      [path.join(__dirname, "..", "search-title-index.js"), ...args],
      { stdio: "inherit" }
    );
    process.exit(result.status ?? 1);
  }

  if (command === "status") {
    const config = getConfig();
    const state = getIndexState(config);
    const payload = {
      status: state.status,
      reason: state.reason,
      data_dir: config.dataDir,
      db_path: config.dbPath,
      metadata_path: config.metadataPath,
      build_lock: config.buildLockPath,
      service_lock: config.serviceLockPath,
      ready_file: config.readyPath,
    };
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (command === "clean") {
    const config = getConfig();
    fs.rmSync(config.dataDir, { recursive: true, force: true });
    console.log(`Removed ${config.dataDir}`);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

function parseBuildArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--file") {
      options.file = args[i + 1];
      i += 1;
    } else if (arg === "--url") {
      options.url = args[i + 1];
      i += 1;
    } else {
      throw new Error(`Unknown build argument: ${arg}`);
    }
  }
  return options;
}

function printUsage() {
  console.log("Usage: wikipedia-title-index <command> [options]");
  console.log("");
  console.log("Commands:");
  console.log("  build [--file <path> | --url <url>]");
  console.log("  serve");
  console.log("  query <prefix-or-title> [limit]");
  console.log("  status");
  console.log("  clean");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
