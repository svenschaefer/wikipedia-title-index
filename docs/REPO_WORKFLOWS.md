# Repo Workflows

## Standard Flow

1. Implement scoped change.
2. Add or update tests.
3. Run local quality gates:
   - `npm test`
   - `npm run lint:openapi`
4. Update docs if behavior/contracts changed.
5. Commit with a clear conventional-style subject.

## Release Flow

1. Start from a clean worktree and run:
   - `npm run release-check`
2. Update `CHANGELOG.md`.
3. Bump version without creating a tag:
   - `npm version <x.y.z> --no-git-tag-version`
4. Re-run explicit checks:
   - `npm test`
   - `npm run lint:openapi`
   - `npm pack --dry-run`
   - `npm run smoke:pack`
5. Commit release files.
6. Push commit and annotated tag.
7. Publish and verify per `NPM_RELEASE.md`.

Rules:

- Do not rewrite tagged release history.
- Do not amend a tagged release commit.
- If a release is wrong, ship a new patch release.
