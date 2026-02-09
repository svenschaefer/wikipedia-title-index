const { constants } = require("node:sqlite");

const ALLOWED_TOP_LEVEL = /^\s*(select|with)\b/i;

function validateQueryRequest(sql, params, config) {
  if (typeof sql !== "string" || sql.trim() === "") {
    throw createClientError("INVALID_REQUEST", "sql must be a non-empty string");
  }
  if (!ALLOWED_TOP_LEVEL.test(sql)) {
    throw createClientError("QUERY_REJECTED", "Only SELECT queries are allowed");
  }
  if (!isSingleStatement(sql)) {
    throw createClientError("QUERY_REJECTED", "Only a single SQL statement is allowed");
  }
  if (params !== undefined && !Array.isArray(params)) {
    throw createClientError("INVALID_REQUEST", "params must be an array");
  }
  if (Array.isArray(params) && params.length > config.maxParamCount) {
    throw createClientError("LIMIT_EXCEEDED", "Too many SQL parameters");
  }
}

function createAuthorizer() {
  return (actionCode, arg1, arg2, dbName) => {
    if (actionCode === constants.SQLITE_SELECT) {
      return constants.SQLITE_OK;
    }

    if (actionCode === constants.SQLITE_FUNCTION) {
      return constants.SQLITE_OK;
    }

    if (actionCode === constants.SQLITE_READ) {
      if (!isAllowedDbName(dbName)) {
        return constants.SQLITE_DENY;
      }
      if (arg1 !== "titles") {
        return constants.SQLITE_DENY;
      }
      if (!isAllowedReadColumn(arg2)) {
        return constants.SQLITE_DENY;
      }
      return constants.SQLITE_OK;
    }

    return constants.SQLITE_DENY;
  };
}

function isAllowedReadColumn(columnName) {
  // SQLite can report table-level reads for aggregates like COUNT(*)
  // without a concrete column name.
  return columnName === "t" || columnName === "" || columnName == null;
}

function isAllowedDbName(dbName) {
  // Some SQLite authorizer callbacks report null for dbName.
  return dbName === "main" || dbName == null;
}

function isSingleStatement(sql) {
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    const next = sql[i + 1];

    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (!inSingle && !inDouble) {
      if (ch === "-" && next === "-") {
        inLineComment = true;
        i += 1;
        continue;
      }
      if (ch === "/" && next === "*") {
        inBlockComment = true;
        i += 1;
        continue;
      }
    }

    if (!inDouble && ch === "'") {
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && ch === '"') {
      inDouble = !inDouble;
      continue;
    }

    if (!inSingle && !inDouble && ch === ";") {
      const remaining = sql.slice(i + 1).trim();
      if (remaining.length > 0) {
        return false;
      }
    }
  }

  return !inSingle && !inDouble && !inLineComment && !inBlockComment;
}

function createClientError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

module.exports = {
  validateQueryRequest,
  createAuthorizer,
  createClientError,
  isAllowedReadColumn,
  isAllowedDbName,
};
