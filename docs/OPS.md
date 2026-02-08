# OPS.md — Operational Guidelines  
Wikipedia Titles Query Service

> Status: operations specification for the implemented local service runtime.

This document defines **operational requirements and procedures** for running
the Wikipedia Titles Query Service.

It is authoritative for:
- mutual exclusion between build and service
- streaming builds (local file or remote gzip)
- automatic provisioning on first run (auto-setup)
- deterministic and debuggable runtime behavior

Naming note:
- All operational artifacts and environment variables in this document use the
  **wikipedia-*** prefix (not wiki-*).

Node.js >= 24.10.0 is required.
Earlier versions do not expose the SQLite authorizer API used for SQL enforcement.

To suppress Node experimental warnings for SQLite:
set NODE_NO_WARNINGS=1

---

## 1. Process Model

Two mutually exclusive processes exist:

1. **Build process**
   - CLI job
   - Creates or rebuilds the SQLite titles index
   - May be invoked explicitly or implicitly (auto-setup)

2. **Query service**
   - Long-running local REST service
   - Serves constrained SELECT queries
   - May trigger auto-setup on first run

**These two processes MUST NEVER run concurrently.**

---

## 2. Mutual Exclusion and Locks

### Runtime Directory

All runtime coordination artifacts live under:

```

data/run/

```

### Lockfiles

```

wikipedia-build.lock     # build process active
wikipedia-indexed.lock    # query service active

```

### Enforcement Rules

#### Build process

- MUST fail to start if `wikipedia-build.lock` exists with a live PID
- MUST fail to start if `wikipedia-indexed.lock` exists with a live PID
- MUST remove stale lock files automatically when lock PID is not alive
- MUST acquire `wikipedia-build.lock` before any build activity
- MUST release the lock on:
  - normal completion
  - error
  - SIGINT / SIGTERM

#### Query service

- MUST fail to start if `wikipedia-indexed.lock` exists with a live PID
- MUST fail to start if `wikipedia-build.lock` exists
- MUST remove stale `wikipedia-indexed.lock` automatically when lock PID is not alive
- MUST acquire `wikipedia-indexed.lock` before binding the network port
- MUST release the lock on shutdown

Locks are created using **atomic exclusive open** after stale-lock validation.
No polling or retries are permitted.

---

## 3. Auto-Setup on First Run

Auto-setup is supported to provision the index automatically when the query
service is started and the index is missing or incompatible.

### Trigger Conditions

Auto-setup MAY be triggered when starting the query service if:

- the SQLite DB file does not exist, or
- metadata is missing, or
- metadata indicates an incompatible schema or version

Auto-setup MUST NOT be triggered during `npm install`.

### Auto-Setup Semantics

When auto-setup is triggered:

1. The query service MUST:
   - ensure no service or build lock exists
   - acquire `wikipedia-build.lock`
2. Run the build pipeline (streaming)
3. Release `wikipedia-build.lock`
4. Continue normal service startup

If auto-setup fails:
- the service MUST NOT start
- no partial or inconsistent DB must remain

### Control Flags

Auto-setup MUST be controllable via environment variables:

- `WIKIPEDIA_INDEX_AUTOSETUP=0`
  - disables auto-setup
  - service fails fast if index is missing

---

## 4. Ready / Discovery Artifact

After successful startup, the query service MUST publish:

```

data/run/wikipedia-indexed.ready

```

The file MUST contain:
- bind address
- bind port
- database path
- API version
- startup timestamp

The ready file MUST be removed on shutdown.

This file is **informational only** and MUST NOT be used for locking.

---

## 5. Network Binding

- The service MUST bind to `127.0.0.1`
- Binding to `0.0.0.0` is forbidden
- Port MUST be configurable
- If the configured port is unavailable, startup MUST fail
- No dynamic port selection is allowed

---

## 6. Data Location and Overrides

Default data locations MAY be overridden via environment variables:

- `WIKIPEDIA_INDEX_DATA_DIR`  
  Root directory for all data and runtime artifacts.

- `WIKIPEDIA_INDEX_DB_PATH`  
  Full path to the SQLite DB file. If set, it takes precedence over the default
  derived from `WIKIPEDIA_INDEX_DATA_DIR`.

All derived paths MUST be computed as:

- DB default:
  - `${WIKIPEDIA_INDEX_DATA_DIR}/index/titles.db`

- metadata default:
  - `${WIKIPEDIA_INDEX_DATA_DIR}/index/metadata.json`

- runtime artifacts:
  - `${WIKIPEDIA_INDEX_DATA_DIR}/run/*`

If `WIKIPEDIA_INDEX_DATA_DIR` is not set, the default root is:

- `data/` (relative to the current working directory)

---

## 7. Resource Limits

The query service MUST enforce hard limits independent of client input.

### Row Limits

- A global `MAX_ROWS` MUST be enforced
- Client-provided limits MUST NOT exceed it
- Truncation MUST be explicitly signaled in the response

### Payload Limits

- A maximum response size (bytes) MUST be enforced
- If exceeded, the request MUST fail with `LIMIT_EXCEEDED`

### Parameter Limits

- A maximum number of SQL parameters SHOULD be enforced
- Requests exceeding it MUST be rejected

---

## 8. Authorization and Query Enforcement

Query constraints are enforced via **SQLite Authorizer**.

Operational guarantees:

- Authorization happens before execution
- Only `SELECT` statements are allowed
- Only table `main.titles` is accessible (column `t`)
- All writes, schema changes, PRAGMA, ATTACH, and transaction control are forbidden
- Access to `sqlite_master` / `sqlite_schema` is forbidden

Rejected queries MUST NOT execute.

---

## 9. Error Handling

Errors MUST be:

- explicit
- structured
- deterministic

Each error response MUST include:
- a stable error code
- a human-readable message

The service MUST distinguish:
- invalid request payload
- policy rejection
- limit enforcement
- internal failure

---

## 10. Logging

The service SHOULD log:
- startup
- shutdown
- fatal errors

Per-request logging SHOULD include:
- requestId
- endpoint
- status code
- row count
- truncation flag
- execution time
- response size

SQL text and parameters MUST NOT be logged by default.

---

## 11. Health Endpoint

The health endpoint MUST return:
- service status
- API version
- database path
- database modification time
- database size

The health endpoint MUST NOT execute queries.

---

## 12. Build Process Guarantees

The build pipeline MUST be:
- fully streaming (download/file → decompress → parse → insert)
- memory-bounded
- deterministic
- transactional at the DB level

The build MUST either:
- complete successfully, or
- leave the previous index intact

The build MUST normalize titles by replacing `_` with spaces.

If using a source that includes namespaces:
- the build MUST filter to namespace `0` (main)

---

## 13. Shutdown Semantics

On SIGINT / SIGTERM:

- the service MUST stop accepting new requests
- in-flight requests SHOULD complete within a bounded time
- DB connections MUST be closed
- lock and ready files MUST be removed

Stale locks are automatically recovered by PID liveness checks.

---

## 14. Operational Non-Goals

The service explicitly does NOT:
- auto-update data in the background
- retry failed builds
- self-restart
- expose metrics endpoints
- manage lifecycle beyond its own process

---

## 15. Operational Summary

This service is designed to be:
- single-purpose
- deterministic
- explicitly coordinated
- operationally boring

Correctness and clarity take precedence over convenience.

---

## 16. SQLite WAL/SHM Behavior

Runtime may create companion files next to `titles.db`:

- `titles.db-wal`
- `titles.db-shm`

Operational notes:
- Presence of WAL/SHM files is expected and not an error condition.
- WAL/SHM files are SQLite runtime artifacts, not independent datasets.
- Operators MUST treat `titles.db`, `titles.db-wal`, and `titles.db-shm` as one logical database state.

---

## 17. Troubleshooting

### Service fails with active lock

Expected when lock PID is alive.

Actions:
1. Confirm running process for the lock PID.
2. Stop that process gracefully.
3. Start service again.

### Lock file exists but process is gone

Expected stale-lock scenario.

Behavior:
- Startup performs PID liveness check.
- Stale lock is removed automatically.
- Startup continues.

### First run appears slow

Likely auto-setup build and download in progress.

Checks:
1. Monitor process output for indexed row progress.
2. Verify `data/index/metadata.json` appears after build.
3. Verify `data/run/wikipedia-indexed.ready` appears after successful startup.

---

## 18. First-Run Recovery Runbook

Use this when first-run auto-setup is interrupted.

1. Stop any running service process.
2. Remove stale run artifacts in `data/run/` if no process is alive.
3. Keep `WIKIPEDIA_INDEX_AUTOSETUP=1` (default behavior).
4. Start service again:
   - `npx wikipedia-title-index serve`
5. Validate health:
   - `GET /health` returns `200`
   - `db_path` and `api_version` are present.
