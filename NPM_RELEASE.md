# NPM Release Process

This document captures the release flow used for `wikipedia-title-index`.

## Scope

- Applies to patch/minor releases published to npm as `wikipedia-title-index`.
- Goal: deterministic, test-first, no retroactive history edits.

## 1) Prepare Changes

1. Implement only the scoped fix/feature.
2. Add or update regression tests for changed behavior.
3. Ensure the worktree is clean before running release validation:

```powershell
git status --short
```

4. Run release validation (this must run on a clean worktree because `release-check` enforces it):

```powershell
npm run release-check
```

5. Update `CHANGELOG.md` with a new version section.
6. Bump version locally:

```powershell
npm version <x.y.z> --no-git-tag-version
```

## 2) Validate in Main Repo

After changelog/version edits, run explicit validation (do not use `release-check` here because the worktree is intentionally dirty):

```powershell
npm test
npm run lint:openapi
npm pack --dry-run
```

## 3) Smoke-Test Packaged Artifact (Pre-Publish, Local Tarball)

Create tarball from current workspace:

```powershell
npm pack
```

Create a clean smoke workspace (example):

```powershell
New-Item -ItemType Directory -Path C:\code\wikipedia-title-index-smoke-test\published-<x.y.z>-smoke -Force
cd C:\code\wikipedia-title-index-smoke-test\published-<x.y.z>-smoke
npm init -y
npm install C:\code\wikipedia-title-index\wikipedia-title-index-<x.y.z>.tgz
```

Run smoke checks:

```powershell
node -e "console.log(require('wikipedia-title-index/package.json').version)"
npx wikipedia-title-index --help
npx wikipedia-title-index status
```

Run at least one API/CLI sanity check:

```powershell
node -e "const api=require('wikipedia-title-index'); console.log(Object.keys(api).length >= 0 ? 'ok' : 'fail');"
```

Optional service-mode check:

```powershell
npx wikipedia-title-index serve
# In a second shell:
# curl http://127.0.0.1:32123/health
```

## 4) Commit + Tag + Push

Commit release contents:

```powershell
git add CHANGELOG.md package.json package-lock.json
git commit -m "release: v<x.y.z>"
```

If the release includes documentation-only updates (for example `README.md` or `NPM_RELEASE.md`), include them explicitly in the same commit.

Push branch and tag (annotated tag only):

```powershell
git push origin main
git tag -a v<x.y.z> -m "v<x.y.z> - <short release note>"
git push origin v<x.y.z>
```

Rules:
- Do not amend release commit after tagging.
- If anything is wrong after publish/tag, ship a new patch version.

## 5) Publish to npm

Login/auth:

```powershell
npm login
npm whoami
```

Automation policy:
- If npm auth is active (`npm whoami` succeeds), release automation MAY execute `npm publish --access public` directly without additional user interaction.
- If npm auth is missing/expired (`npm whoami` fails or publish returns auth/token errors), pause and ask the user to run `npm login`.
- After user confirms successful login, continue the automated release flow from publish through post-publish verification.

Publish:

```powershell
npm publish --access public
```

## 6) Verify npm Propagation

Run explicit registry checks:

```powershell
npm view wikipedia-title-index versions --json --registry=https://registry.npmjs.org/
npm view wikipedia-title-index@<x.y.z> version --registry=https://registry.npmjs.org/
npm info wikipedia-title-index dist-tags --registry=https://registry.npmjs.org/
```

Expected:
- `<x.y.z>` present in `versions`
- `npm view wikipedia-title-index@<x.y.z> version` returns `<x.y.z>`
- `dist-tags.latest` points to `<x.y.z>`

Note: short propagation delay can occur right after publish.

## 7) Smoke-Test Published Package (Post-Publish, Public npm)

After npm propagation confirms the new version is available, perform a second smoke test from the public registry.

Create a clean smoke workspace (example):

```powershell
New-Item -ItemType Directory -Path C:\code\wikipedia-title-index-smoke-test\published-<x.y.z>-public-smoke -Force
cd C:\code\wikipedia-title-index-smoke-test\published-<x.y.z>-public-smoke
npm init -y
npm install wikipedia-title-index@<x.y.z>
```

Run smoke checks:

```powershell
node -e "console.log(require('wikipedia-title-index/package.json').version)"
npx wikipedia-title-index --help
npx wikipedia-title-index status
```

Optional service-mode check:

```powershell
npx wikipedia-title-index serve
# In a second shell:
# curl http://127.0.0.1:32123/health
```

## 8) Create GitHub Release

Create release for the pushed tag using the matching `CHANGELOG.md` section:

```powershell
gh release create v<x.y.z> --title "v<x.y.z>" --notes-file <notes-file>
```

Verify:

```powershell
gh release view v<x.y.z> --json name,tagName,url,isDraft,isPrerelease,publishedAt
```

## 9) Final Checklist

- `git status` is clean.
- `main` is synced with `origin/main`.
- npm package is live with expected `latest` tag.
- post-publish smoke test with public npm package passed.
- GitHub release exists for `v<x.y.z>`.
