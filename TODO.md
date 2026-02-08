# TODO (v1.1)

This file tracks the planned improvements for `wikipedia-title-index` v1.1.

## 1) Repository and Source Layout

- Move runtime source files from repository root into a structured source tree:
  - `src/cli/build.js`
  - `src/cli/search.js`
  - `src/server/wikipedia-indexed.js`
  - `src/index.js`
- Keep `bin/` as thin wrappers only.
- Keep package public surface strict via `package.json.exports`.
- Keep root focused on metadata and docs.

## 2) Documentation Structure

- Move operational/design docs into `docs/`:
  - `AGENT.md`
  - `NPM.md`
  - `OPS.md`
- Keep `README.md` concise and user-focused.
- Add cross-links between README and docs pages.

## 3) CI and Release Guardrails

- Add GitHub Actions CI matrix for:
  - `windows-latest`
  - `ubuntu-latest`
  - `macos-latest`
- Run required checks in CI:
  - `npm test`
  - `npm run lint:openapi`
- Require green CI before merge.

## 4) Testing and Fixtures

- Consolidate test fixtures under `test/fixtures/`.
- Ensure tests that must remain offline always use local fixtures.
- Add explicit tests for:
  - stale lock recovery
  - concurrent `serve` lock rejection (`pid running`)
  - listen-error cleanup path (lock release on startup failure)

## 5) Packaging and API Contract

- Add/maintain `.d.ts` for documented public JS exports only.
- Keep error contract stable:
  - stable: `error.code`, `error.message`, optional `requestId`
  - additive `error.details` fields allowed without major bump
- Keep OpenAPI contract version and package version aligned.

## 6) Operational Hardening

- Document WAL/SHM runtime file behavior explicitly in ops docs.
- Add a troubleshooting section for lock behavior and stale-lock expectations.
- Add a short runbook for first-run auto-setup and recovery actions.

## 7) Release Hygiene

- Keep changelog entries mandatory for each release.
- Enforce clean working tree before tag/publish.
- Add a `release-check` script to run test + OpenAPI lint + package dry run.
