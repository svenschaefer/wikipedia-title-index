# Baseline Test Run

Purpose: define a stable verification baseline that emphasizes contract invariants.

## Verify Stable Invariants

- CLI/API wiring works end-to-end.
- State-changing commands persist expected changes.
- Rejected/no-op paths do not mutate persisted state.
- Required response envelope fields are present.
- Exit codes follow contract (`0` success, non-zero failure).

## Do Not Over-Constrain Non-Contract Surfaces

Avoid hard-locking:

- incidental log ordering
- exact human-readable wording not declared as contract
- behavior outside documented API/CLI surfaces

## Recommended Baseline Strategy

1. Define fixture input.
2. Run command/API sequence.
3. Assert invariant checkpoints only.
4. Capture summary fields/counts/flags instead of fragile full output snapshots.
5. Keep one deterministic smoke path in CI (`npm run smoke:pack`).

## Suggested Run Checklist

- `npm test`
- `npm run lint:openapi`
- `npm run ci:check`
- `npm run smoke:pack`
