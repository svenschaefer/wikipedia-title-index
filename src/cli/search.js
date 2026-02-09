const { DatabaseSync } = require("node:sqlite");
const { getConfig } = require("../lib/paths");
const { createQueryCache } = require("../lib/query-cache");

const DEFAULT_LIMIT = 25;
const CACHE_KEY_SQL = "cli.query.v1";

function printUsage() {
  console.log("Usage: wikipedia-title-index query <query> [limit]");
  console.log("Examples:");
  console.log('  wikipedia-title-index query "Albert Einstein"');
  console.log('  wikipedia-title-index query "Albert" 50');
}

function main(argv = process.argv.slice(2)) {
  const rawQuery = argv[0]?.trim();
  const query = rawQuery?.replaceAll("_", " ");
  const limitArg = Number.parseInt(argv[1] ?? `${DEFAULT_LIMIT}`, 10);
  const limit =
    Number.isFinite(limitArg) && limitArg > 0 ? limitArg : DEFAULT_LIMIT;

  if (!query) {
    printUsage();
    process.exit(1);
  }

  const config = getConfig();
  const queryCache = createQueryCache(config, {
    validatePayload: isCliCachedPayload,
  });
  const cacheKey = { sql: CACHE_KEY_SQL, params: [query], maxRows: limit };
  const cached = queryCache.get(cacheKey);
  if (cached) {
    printResult(cached.exact, cached.prefix);
    return;
  }

  const db = new DatabaseSync(config.dbPath, { readOnly: true });
  try {
    const exact = db
      .prepare("SELECT t FROM titles WHERE t = ? LIMIT 1")
      .get(query);
    const prefixRows = db
      .prepare(
        "SELECT t FROM titles WHERE t >= ? AND t < ? ORDER BY t LIMIT ?"
      )
      .all(query, `${query}\uffff`, limit);
    const displayedPrefixRows = exact
      ? prefixRows.filter((row) => row.t !== exact.t)
      : prefixRows;
    const exactValue = exact?.t ?? null;
    const prefixValues = displayedPrefixRows.map((row) => row.t);
    queryCache.set(cacheKey, { exact: exactValue, prefix: prefixValues });

    printResult(exactValue, prefixValues);
  } finally {
    db.close();
  }
}

function printResult(exact, prefixValues) {
  if (!exact && prefixValues.length === 0) {
    console.log("No matches");
    return;
  }

  if (exact) {
    console.log("Exact match:");
    console.log(exact);
  }

  if (prefixValues.length > 0) {
    console.log(`Prefix matches (${prefixValues.length}):`);
    for (const title of prefixValues) {
      console.log(title);
    }
  }
}

function isCliCachedPayload(value) {
  if (!value || typeof value !== "object") return false;
  if (!(typeof value.exact === "string" || value.exact === null)) return false;
  if (!Array.isArray(value.prefix)) return false;
  return value.prefix.every((item) => typeof item === "string");
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
};
