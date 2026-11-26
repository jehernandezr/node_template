# 0019. CI, security and tool versions

- Status: Accepted, amended by [ADR 0043](0043-deploy-migrations-and-rollback.md) (deploy after a green CI; `artifact-smoke`, `local-smoke`, `migration-safety`, `contract-compat` and `actionlint` join `ci-ok`)
- Date: 2026-11-12

## Context

The November 12 audit found that CI only covered the Nx workspace: there were no jobs for Flutter, Terraform, contract drift or deferred microfrontend verification; actions were referenced by a moving tag; there was no aggregate check and the Flutter and Terraform versions were not pinned. After ADR 0015 the repository has two applications (`backend/` and `front/`) and Nx at the root orchestrates them in a single graph.

## Decision

### `ci.yml` jobs

A `changes` job (`dorny/paths-filter`) decides what runs. Each job has `timeout-minutes` and minimal permissions (`contents: read`).

| Job            | Runs when this changes                                                                            | What it does                                                                                                                                                                                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `nx`           | any change (Nx decides the affected projects)                                                     | pnpm + Node from `.nvmrc`, check for a single `node_modules` at the root, `flutter pub get`, `.nx/cache` cache, `nx affected -t lint typecheck build analyze format-check` (the `typecheck` also checks the tests), backend tests with minimum coverage (80 % on lines, statements and functions; 75 % on branches), front tests and `nx format:check` |
| `contracts`    | `backend/libs/contracts`, `backend/tsconfig.base.json`, `front/packages/contracts`, `front/tools` | `nx run contracts-export:check` and `dart run contracts_gen --check`: fails if the generated JSON/Dart differs from the TypeScript                                                                                                                                                                                                                     |
| `web-deferred` | `front/**`                                                                                        | `flutter build web --release --source-maps` and `front/tools/check_deferred_chunks.dart`                                                                                                                                                                                                                                                               |
| `terraform`    | `backend/infra/**`                                                                                | Terraform and tflint at the versions in `.terraform-version` and `.tflint-version`, `terraform fmt -check -recursive`, `tf-validate.mjs` (init, validate and `terraform test` for each stack and example), Python tests for the Lambdas and scripts, shellcheck and tflint with the AWS ruleset                                                        |
| `ci-ok`        | always                                                                                            | Aggregates the result of all jobs                                                                                                                                                                                                                                                                                                                      |

`ci-ok` uses `if: always()` and fails if any required job ended in `failure` or `cancelled`; `skipped` is valid (the path filter skipped it). **It is the only required check** in the `main` branch protection (check name: `ci-ok`). `ci-ok` only aggregates the jobs in `ci.yml`; `security.yml` runs separately, and the `main` protection is configured by the repository owner (ADR 0020). That way the conditional jobs do not block PRs that do not touch them.

### Deferred chunk verification

`front/tools/check_deferred_chunks.dart` is a standalone script (no pubspec). It fails if:

1. `main.dart.js.map` lists sources from `microfrontends/*/lib/src/{data,screens,l10n}`; or
2. any backoffice ARB text (12 characters or more, to avoid matches with single words; the segments outside `{placeholders}`) appears in `main.dart.js`, either literally or with dart2js's `\xHH`/`\uHHHH` escapes.

When it was introduced, it failed because the sources of `microfrontends/notifications/lib/src/data/*` traveled in the initial bundle (the audit finding "the notifications fake travels in the initial bundle"). The migration of `mf_notifications` to the ADR 0018 contract fixed it and today the check passes.

### Tool versions

- Node: `.nvmrc` at the root. pnpm: the `packageManager` field of the root `package.json`.
- npm dependencies: exact version in `package.json` and `backend/package.json`, the only two `package.json` files (ADR 0015). Renovate keeps them exact (`rangeStrategy: pin`).
- Flutter: `front/.flutter-version` (3.50.0). CI reads it and passes it to `subosito/flutter-action`.
- Terraform: `backend/infra/terraform/.terraform-version` (1.14.4; the code requires `>= 1.11`).
- Renovate covers `.flutter-version` with a regular expression manager and `.terraform-version` and `.nvmrc` with their native managers.

### Actions pinned by SHA

Every third-party action is referenced by the full commit SHA with a comment carrying the version (`@<sha> # vX.Y.Z`). Renovate (`helpers:pinGitHubActionDigests`) keeps the SHAs up to date. Annotated tags are resolved to the commit, not to the tag object.

### `security.yml`

Runs on PRs, on `main` and every Monday:

- **gitleaks** with the CLI installed from the pinned release (8.30.1) and SHA-256 verification, over the whole history. The version and the checksum are updated by hand together (Renovate does not manage them, so it does not open PRs that fail the verification).
- **dependency-review-action** on PRs (high or critical severity).
- **OSV-Scanner** over `pnpm-lock.yaml` and `front/pubspec.lock`.
- **Trivy (config)** over `backend/infra/terraform` (HIGH and CRITICAL). Trivy was chosen over Checkov because it is a single binary with no Python dependencies.
- **CodeQL** for `javascript-typescript`.

### History and `.env`

The audit anticipated that gitleaks would flag the `.env` in commit `a076bb9`. Running gitleaks 8.30.1 over the full history reported no findings (the values are for local development and match no rule), and the user confirmed they were never used. `.gitleaksignore` only holds specific fingerprints (`gitleaks git --report-format json`, `Fingerprint` field), with a comment citing this ADR, and the history is never rewritten. Today it has two, from the same test JWT in `redaction.spec.ts`: the one from the `main` commit (`13f606f`) and the one from commit `04a3914`, which is still on a remote branch that gitleaks walks with `--all`. The test now builds that JWT at runtime, so it will not appear in new commits.

### Required repository configuration

- `main` protection: require only the `ci-ok` check and that the branch is up to date.
- Enable the dependency graph (needed for dependency-review) and code scanning (CodeQL uploads SARIF).
- Install the Renovate app.

## Consequences

- A PR that only touches documentation does not run the code jobs and still satisfies `ci-ok`.
- Changing `ci.yml` runs every job (it is included in every filter).
- Updating an action requires Renovate (or a person) to resolve the new SHA; there are no moving tags.
