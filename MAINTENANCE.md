# Maintenance Runbook

This runbook captures recurring maintainer operations for `wikipedia-title-index`.

## Routine Checks

Run baseline quality gates:

```bash
npm run ci:check
npm run smoke:pack
```

Optional local pre-commit gate:

```bash
npm run pre-commit-check
```

## Release Owner Checklist

1. Confirm clean worktree: `git status --short`
2. Run release gate: `npm run release-check`
3. Update `CHANGELOG.md` and bump version with `npm version <x.y.z> --no-git-tag-version`
4. Re-run validation:
   - `npm test`
   - `npm run lint:openapi`
   - `npm pack --dry-run`
   - `npm run smoke:pack`
5. Commit/tag/push and publish per `NPM_RELEASE.md`
6. Verify npm propagation and GitHub release.

## Rollback Policy

If a release is wrong after tag/publish:

- Do not rewrite tagged history.
- Do not unpublish stable versions.
- Ship a new patch release with corrective changes.

## Cache/Index Recovery

Cache issues:

```bash
npx wikipedia-title-index cache clear
```

Index reset and rebuild:

```bash
npx wikipedia-title-index clean
npx wikipedia-title-index build
```

If custom DB path is used, verify:
- `WIKIPEDIA_INDEX_DB_PATH`
- `WIKIPEDIA_INDEX_DATA_DIR`
