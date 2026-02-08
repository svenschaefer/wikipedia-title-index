# AGENT.md — Wikipedia Titles Query Service Agent

> Status: active behavioral contract for this folder implementation
> (`build-title-index.js`, `search-title-index.js`, `wikipedia-indexed.js`).

This document defines the **behavioral, semantic, and lifecycle contract** for the
Wikipedia Titles Query Service agent.

It is authoritative for:
- human contributors
- automated agents
- refactoring or re-implementation

The agent is defined by **constraints and guarantees**, not by implementation details.

---

## 1. Agent Role

The agent provides **read-only, open SELECT querying** over a local
Wikipedia titles index.

It acts as:
- a **local infrastructure service**
- a **shared query surface** for local consumers
- a **hard boundary** around SQLite access

The agent MUST NOT expose SQLite as a general-purpose database.

---

## 2. Process Model

Two processes exist:

1. **Build process**
   - CLI-driven
   - Creates or rebuilds the SQLite index
   - May be invoked explicitly or implicitly (auto-setup)

2. **Query service**
   - Long-running local REST service
   - Executes constrained SELECT queries
   - May trigger auto-setup on first run

These processes are **mutually exclusive** and MUST NEVER run concurrently.

---

## 3. Auto-Setup Semantics (First Run)

The agent supports **automatic provisioning on first run**.

### Trigger Conditions

Auto-setup MAY be triggered when starting the query service if:
- the index database does not exist, or
- required metadata is missing, or
- metadata indicates an incompatible schema or version

Auto-setup MUST NOT occur during package installation.

### Guarantees

When auto-setup is triggered:
- the agent MUST acquire the build lock
- the build pipeline MUST run deterministically
- the service MUST start only after a successful build
- on failure, the service MUST NOT start

Auto-setup behavior MUST be:
- idempotent
- explicit
- fully controllable via configuration

---

## 4. Scope of Authority

### Allowed

The agent MAY:
- execute **SELECT** statements
- read from table `main.titles`
- bind positional parameters
- return structured JSON results
- enforce server-side limits
- serve multiple concurrent clients

### Forbidden

The agent MUST NOT:
- execute non-SELECT statements
- modify data or schema
- expose additional tables or databases
- allow PRAGMA, ATTACH, or transaction control
- expose SQLite metadata tables
- infer, rewrite, or optimize queries
- maintain session state across requests

---

## 5. Determinism Guarantees

The agent MUST ensure:

- Query acceptance or rejection is **deterministic**
- Authorization decisions occur **before execution**
- Identical inputs against identical DB state produce identical outputs
- No adaptive behavior or hidden heuristics are used

Enforcement MUST rely on **SQLite engine mechanisms**
(e.g. SQLite Authorizer), not on string inspection.

---

## 6. Query Model

The agent accepts:
- a **single SQL SELECT statement**
- positional parameters (`?1`, `?2`, …)

The agent enforces:
- single-statement execution
- operation-level and table-level authorization
- server-side row and payload limits independent of client SQL

SQL is treated as an **opaque instruction**, subject only to authorization
and operational limits.

---

## 7. Interface Contract

The agent exposes a **local REST interface**:

- JSON request / JSON response
- Explicit, stable error codes
- Versioned endpoints
- Stateless request handling

The REST API is the **only supported interface**.

---

## 8. Failure Semantics

On failure, the agent MUST:
- reject queries explicitly
- return structured error responses
- distinguish clearly between:
  - invalid input
  - policy rejection
  - limit enforcement
  - internal failure

The agent MUST NOT:
- partially execute queries
- return partial results without explicit truncation
- retry or alter client queries implicitly

---

## 9. Concurrency Model

The agent:
- MAY handle multiple concurrent requests
- MUST isolate requests from each other
- MUST NOT share mutable query state

SQLite access MUST be configured such that:
- all access is read-only
- concurrent reads are safe
- writes are impossible

---

## 10. Operational Artifacts

The agent MUST manage and respect:

- **Lockfiles**
  - enforce mutual exclusion between build and service processes

- **Ready marker**
  - published only after successful startup
  - removed on shutdown

These artifacts are authoritative for operational state.

---

## 11. Configuration Surface

The agent MAY be configured via environment variables for:
- data directory
- database file path
- listening port
- auto-setup enable/disable
- operational limits (rows, payload size)

Configuration MUST NOT:
- weaken authorization constraints
- change query semantics
- introduce conditional behavior based on client queries

---

## 12. Observability

The agent SHOULD:
- log startup and shutdown
- log fatal errors
- log request metadata (without SQL text)

The agent MUST NOT:
- log SQL statements or parameters by default
- alter behavior based on logging or metrics

Observability is strictly passive.

---

## 13. Stability Contract

The following constitute **breaking changes**:

- relaxing authorization constraints
- changing accepted SQL classes
- altering response structure or error codes
- exposing additional tables or operations
- changing auto-setup or lock semantics

Breaking changes MUST:
- increment API version
- update OpenAPI specification
- be documented explicitly

---

## 14. Non-Goals

The agent explicitly does NOT aim to:
- optimize or rewrite queries
- estimate query cost or runtime
- cache results
- provide semantic search
- expose full Wikipedia content
- manage updates automatically in the background
- manage its own lifecycle or restarts

---

## 15. Summary

This agent exists to provide:

> **Open querying without open authority,  
> with explicit provisioning and deterministic behavior.**

It is intentionally narrow, explicit, and operationally strict.

That constraint is the design.
