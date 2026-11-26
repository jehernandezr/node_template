# 0047. Shared test servers, rule guards and impact review

- Status: Accepted
- Date: 2026-11-26

## Context

A full backend verification took most of an hour and a half on the build machine, and most of it was container
start-up: every integration file, and sometimes every `describe`, started its own PostgreSQL and Valkey and ran every
migration again. Fixed findings kept coming back between cycles (filler JSDoc, `jest.fn`, Spanish text, collaborators
built with `new`) because most rules were checked only by the reviewer, and the review read the changed lines without
mapping what they affect elsewhere.

## Decision

### Tests

- **One server pair per Jest run.** `backend/jest.global-setup.cjs` starts one PostgreSQL
  (`pgvector/pgvector:0.8.7-pg17`, which serves every suite) and one Valkey (`valkey/valkey-bundle:8.1`) per Jest run
  and publishes them through `NT_TEST_*` variables, which `SharedTestServers` in `@platform/kernel/test-utils` reads.
  Container suites run one at a time on them (`maxWorkers: 1`).
- **Isolation per suite.** `ShardedTestDatabase`, `ServicePostgresServer`, `TransferTestDatabases` and the smoke
  infrastructure create their own databases and drop them when they stop. Fixed names are dropped and created again
  at start, and a second instance alive in the same suite takes a `namespace`. Every service role of the run logs in
  with one generated password. The first `ValkeyTestServer` of a suite empties Valkey, so each suite sees it fresh;
  a test that needs two Valkey servers that do not see each other, such as two regions, passes a `DedicatedValkeyHost`.
- **Isolated suites.** A suite that changes server-level state runs on a container of its own: role creation,
  logical replication and publications, the tenant-move rehearsal with two instances and the write-gate tests with
  two PostgreSQL and two Valkey servers. It uses `IsolatedPostgresServer`, `RegionServers` or `DedicatedValkeyHost`,
  carries an `@isolated-server` tag in its header and is listed in `backend/isolated-server-suites.json`. A tooling
  test fails when the tags and the list differ, when a listed suite starts no dedicated server, or when a suite with
  role, publication, subscription, slot or server-setting statements is not listed. Every other suite shares the
  server of its run.
- **Migrated templates.** `TestDatabaseServer.cloneFromTemplates` migrates a set of template databases the first time
  a run meets a set of migrations (keyed by the names and sources of the migrations and the shard extensions) and
  clones them with `CREATE DATABASE … TEMPLATE` for every later suite, under an advisory lock. A template is marked
  ready with a database comment only after its build succeeds, and a failed build drops it, so one broken migration
  fails one suite instead of every later clone. The catalog template of a service holds no shard rows: each suite
  registers its own shards.
- **Fast server.** The test PostgreSQL runs with `fsync=off`, `synchronous_commit=off` and `full_page_writes=off`,
  its data on tmpfs, and with `wal_level=logical` for the replication tests.
- **Two targets.** `test` runs the unit tests with parallel workers; `test-int` (a second `@nx/jest/plugin` entry)
  runs the `.int-spec.ts` and `.e2e-spec.ts` suites; `test-int:ci` runs both, which is what coverage is measured on.
  `jest.preset.js` picks the tests from the Nx target (`NX_TASK_TARGET_TARGET`) or from `NT_TEST_KIND`. Both targets
  are cached with explicit inputs in `nx.json`, and both hash `^testUtils`, the `src/**/__tests__/utils` folders of
  their dependencies: `^production` leaves those folders out, so without it a change to a shared harness such as
  `ShardedTestDatabase` replayed the cached result of every dependent. The `test` entry is filtered to
  `@nx/jest/plugin`, so the Flutter `test` targets keep their own inputs. A tooling test fails when either target
  drops `^testUtils` or a `test-utils` alias points outside those folders. For the same reason the inferred `lint` target hashes
  `backend/eslint.*`, so a new guard or a lower baseline lints every project again instead of replaying its cache. Nx already keeps one cache for every checkout of the workspace under `~/.nx`, and
  setting `NX_CACHE_DIRECTORY` would turn that sharing off. Jest keeps its transform cache in
  `~/.cache/node-template/jest` (or `NT_JEST_CACHE_DIRECTORY`), on disk and shared by the worktrees, instead of the
  small temporary folder.
- **CI and rounds.** CI splits the affected projects with a `test-int` target across a matrix of three runners,
  each running `test-int:ci --coverage`, and keeps a fast unit step in the `nx` job. Each project is its own Jest
  run with its own `globalSetup` container, so no container is shared across shards. Each shard uploads the coverage
  summary of its projects, and one `coverage` job merges them and fails a project that is under the threshold or
  that no shard covered; `ci-ok` requires the shards and the coverage job. The runners start only when a backend
  path changed. This replaces the coverage step of [ADR 0037](0037-composition-shared-platform-pieces-and-domain-events.md),
  which passed `--coverage` to `nx affected -t test`. In the workflow, intermediate rounds run the affected projects
  without coverage and the final round runs `lint typecheck` and then `test-int:ci --coverage` as two commands, because
  Nx forwards `--coverage` to every target and `tsc` and ESLint reject it; a tooling test fails when a workflow
  command gives `--coverage` to a target other than `test` or `test-int`, and another when a live doc presents
  `-t test` alone as the CI, coverage or integration run.

### Guards

- `docs/quality/rule-checks.md` lists every rule of `CLAUDE.md` and the skills next to its check, or marks it
  `review only`. A rule is one top-level bullet of `CLAUDE.md` or of a rule section of a skill's `SKILL.md`, with a
  stable id: `claude.<section>.<n>` or `<skill>.<n>`. Numbered procedure steps, tables and the `references/` files
  detail those rules and have no rows. A test fails when an id has no row, a row names an id that is gone, or the
  rule at an id no longer starts with the words of its row.
- New lint rules in `backend/eslint.guards.mjs`: no Jest doubles (`jest.fn`, `jest.spyOn`, `jest.mock`,
  `jest.replaceProperty` and kin); no `new` of a collaborator, recognized by its role suffix, outside tests, Nest
  modules and wiring, selectors, factories and entry points; no `@Global()` outside `libs/platform`; no harness that
  starts its own PostgreSQL or Valkey container outside `DedicatedValkeyHost` and `RegionServers`. The front
  structure check rejects mocking libraries.
- The comment rule reads overloads as one method with its JSDoc on the first signature, checks the JSDoc an override
  carries, rejects delegation filler on facades, repositories, stores, adapters and clients, counts parameter names
  as part of the name a summary may not just repeat, and lets a summary that shows a format in a code span stand. The
  tooling config requires a JSDoc on private methods as well.
- `.claude/guards/check-language.mjs` flags Spanish in developer text and commit messages. It matches whole words of
  a closed list of fifty high-signal Spanish function words, and accented characters, `ñ`, `¿` and `¡`, in the
  comments and strings of code, in docs and in commit messages. `.claude/guards/language-allowlist.json` holds the
  paths of product text (ARB files, generated localizations, email templates, notification texts, historical audits)
  and single lines, each with its reason; a false positive is fixed there, never by widening the word list in the
  same change. Single-quoted literals of tests and fake repositories are data. Commitlint rejects attribution lines.
- **Baselines that only shrink.** A rule that cannot be fixed everywhere at once records what is left:
  `backend/eslint.baseline.json` for the lint guards and `.claude/guards/language-baseline.json` for the language
  check, which is now empty. Both are checked in. A test fails when an entry no longer breaks its rule, so each fix
  lowers the baseline; another caps each entry and the total at the recorded counts, and a third compares each
  baseline with the one where the branch forked, so no branch raises a count or adds a file.
  `check-language.mjs --update-baseline` only lowers entries; it never raises one or adds a file.
- **Three places.** The pre-commit hook runs the guards on the staged files only through lint-staged (the structure
  checks with `--staged`); anything that reads the whole repository or runs Nx belongs to CI and the gate, and a
  tooling test fails when a pre-commit command does otherwise. The `commit-msg` hook
  checks the message, CI runs a required `guards` job, and `.claude/guards/run-gate.mjs` runs them all as the gate the
  `phase-cycle` workflow runs before each review; the builder fixes a red gate before the reviewer starts.
- **A finding closes with its guard**: a lint rule, a structure check, the language check or a test that fails when
  the fix is reverted. The builder names it and the reviewer reverts the fix to see it fail.

### Review

- `.claude/impact/impact-map.mjs` lists the affected projects, the importers and subtypes of every export of the
  changed files and every repository occurrence of the string-keyed identifiers the diff changed. Importers count
  only when an import resolves to the declaring module or a barrel over it (relative paths, the backend aliases and
  Dart `package:` URIs), and importers that the diff also changes are listed and marked `(in diff)`. It reads
  TypeScript, ES and CommonJS modules and Dart. The identifiers cover the backend (event names, environment
  variables, error codes, key prefixes and routes), the front (ARB keys, routes and `RepositoryBinding` types) and the
  infrastructure (Terraform variables and outputs, `topology.json` entries and workflow jobs), and the map lists the
  generated and configuration paths a change drags along, such as the generated Dart of the contracts. The reviewer
  starts from it and adds the couplings only reading reveals. `blast-radius` runs in every backend cycle.
- The reviewer receives the diff, the previous findings and `rule-checks.md`, does not re-check what the green gate
  proves and spends the round on design, behaviour and impact. Later plans split their work into smaller cycles with
  one PR each, so every review covers a narrower diff.

## Consequences

### Positive

- An integration suite pays one database clone instead of a container start and a full migration.
- A fixed finding cannot return without a red check, and the reviewer's time goes to what no check covers.
- The review covers couplings that no import shows.

### Costs

- Suites share a server, so they must run one at a time on it and must not depend on server-wide state beyond what
  they create; a suite that needs two independent servers asks for a dedicated one.
- Templates assume migrations do not depend on the database name; one that did would need a template key of its own.
- The collaborator rule recognizes classes by name, and the language check by vocabulary; both have false negatives,
  which the reviewer still covers.

## Alternatives considered

- Testcontainers reuse (`withReuse`) instead of a global setup: containers would outlive the run and need their own
  clean-up outside the label filter.
- Isolation by schema inside one database: the persistence layer maps a logical shard to a database name.
- Jest `--shard` inside each project: it splits the tests of a project, so the per-project coverage threshold could
  no longer be enforced.
