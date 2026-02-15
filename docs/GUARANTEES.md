# Guarantees

This file defines high-level behavior guarantees for `wikipedia-title-index`.

## Core Guarantees

- Deterministic lookup behavior for the same DB state and request inputs.
- Fail-fast validation for invalid request bodies, SQL policy violations, and limit violations.
- Explicit authority boundaries:
  - persisted SQLite DB + metadata are authoritative runtime data
  - cache entries are derived and disposable
- Stable structured error envelope with `error.code` and `error.message`.
- Single-build and single-service process coordination via lock files.

## Non-Goals

The project intentionally does not provide:

- hidden retries
- background auto-updates
- undocumented public API surfaces
- write access through query endpoints

## Design Rule

Prefer explicit and operationally predictable mechanics over broad abstractions.
