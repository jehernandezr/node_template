# Cycle 3: test speed and rule guards

Runs after correction cycle 2b and before F12; the decisions are in [ADR 0039](../adr/0039-shared-test-servers-rule-guards-and-impact-review.md). Two goals:

- every cycle gets faster to verify, with less load on the build machine;
- a rule that was fixed once cannot silently come back.

## Why

- **Slow verification.** A full backend verification takes about 90 minutes on the build machine. Most of that time is not spent on tests: each integration file, and sometimes each `describe`, starts its own PostgreSQL and Valkey and runs every migration from scratch. Identity alone does 23 such starts.
- **Rules come back.** Fixed findings kept returning between cycles: filler JSDoc, `jest.fn` and `jest.spyOn`, Spanish text, collaborators built with `new`. Most rules are checked only by the reviewer's judgment, the comment lint has gaps, and the workflow trusts the builder's report.
- **Narrow reviews.** The reviewer read the diff but not always what the diff changes elsewhere. A change can affect the backend without touching the code that breaks: an event name, an environment variable, a migration or a DI token.

## Package A: test speed

| #   | Change                                                                                                                                                                     | Expected effect                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| A1  | One PostgreSQL and one Valkey per Jest run, started by a `globalSetup`. Each suite gets its own new databases and its own Valkey key prefix, so isolation stays the same.  | Removes almost every container start                    |
| A2  | A migrated template database per service, created once per run. Each suite clones it with `CREATE DATABASE … TEMPLATE`.                                                    | Migrations run once instead of once per suite           |
| A3  | The test PostgreSQL runs with `fsync=off`, `synchronous_commit=off` and `full_page_writes=off`, with its data on tmpfs. Only the test image changes.                       | Faster writes and migrations                            |
| A4  | Separate `test` (unit, parallel workers) and `test-int` (containers, one at a time) targets. The Nx cache is on for both, with explicit inputs.                            | Unit tests use the idle cores; unchanged projects skip  |
| A5  | Jest and Nx caches in one folder shared by every worktree.                                                                                                                 | The first round of each cycle starts warm               |
| A6  | CI runs `test-int` split into shards across several runners (`--shard`), restores the Nx cache, and enforces coverage there.                                               | The full suite runs on GitHub, not on the build machine |
| A7  | The workflow runs only affected projects without coverage in intermediate rounds. It runs the full suite with coverage only in the final round, and CI repeats that suite. | Intermediate rounds in minutes                          |

Limits:

- Local parallelism stays at 2 at most, because production containers run on the build machine.
- Container cleanup only ever filters by the `org.testcontainers=true` label.

## Package B: rule guards

| #   | Change                                                                                                                                                                                                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | `docs/quality/rule-checks.md` lists every rule of CLAUDE.md and the skills next to the check that enforces it, or marks it explicitly as "review only". A script test fails when a rule has no entry.                                                                                                           |
| B2  | Close the gaps of `eslint.comments.mjs`: JSDoc required on public arrow-function properties, getters and overloads; filler JSDoc detected on facades. The rule tests include the cases that escaped in cycles 2a and 2b.                                                                                        |
| B3  | New backend lint rules: <br>• no `jest.fn`, `jest.spyOn` or `jest.mock` (test doubles are classes); <br>• no `new` of an injectable collaborator outside selectors, factories, Nest modules and tests; <br>• no `@Global` outside `libs/platform`. <br>The front gets the same analyzer rules where they apply. |
| B4  | Language check: a script flags Spanish text in developer-facing files (code, comments, JSDoc, docs, skills, commit messages). It uses an allowlist of product-text paths: ARB files, email templates, invoices, plan names and test data that is Spanish on purpose.                                            |
| B5  | Every guard runs in three places: <br>• the pre-commit hook, on staged files through lint-staged; <br>• CI, as a required check; <br>• the `phase-cycle` workflow, as a gate run by the script itself before each review. If the gate fails, the builder fixes it first; the reviewer never sees a red gate.    |
| B6  | Baseline ratchet: when a new rule cannot be fixed everywhere in this cycle, the current count is recorded and may only go down.                                                                                                                                                                                 |
| B7  | A finding is closed only with its guard: a lint rule, a structure check, the language check or a test that fails when the change is reverted. The builder names the guard of each closed finding, and the reviewer checks that it exists and fails on the revert.                                               |

## Package C: impact review

The reviewer reviews what the diff does to the rest of the backend, not only the changed lines. Before judging, the reviewer builds an impact map, and the review returns it with each entry checked.

- **Explicit impact.**
  - Projects in `nx affected`.
  - Importers and callers of every changed export, including subclasses of a changed base class and implementations of a changed port.
  - Tests that cover those callers.
- **Implicit impact.** Couplings that no import shows:
  - DI tokens, providers and module imports;
  - event and message names, versions and payload shapes, and their consumers in other services;
  - outbox and saga steps and their compensations;
  - entities, migrations, RLS policies and indexes;
  - environment variables, their defaults and the Terraform that sets them;
  - zod contracts and the generated Dart;
  - routes, error codes and Problem Details;
  - cache and Valkey key formats and TTLs;
  - timeouts, retries and idempotency keys;
  - generator templates;
  - documentation and ADRs that describe the changed behaviour.
- **Script support.** A script, `impact-map`, lists the affected projects, the importers of changed exports and every repository occurrence of string-keyed identifiers that the diff changed: event names, variable names, error codes, key prefixes and routes. The reviewer starts from its output and adds what only reading reveals.
- **Rule for findings.** An impact with no test or explicit check covering it is a finding. A behaviour change in a coupling consumed elsewhere, without a version bump or a migration path, is a blocker.
- **Wiring.** The `blast-radius` review step becomes mandatory for every backend cycle, not only those that touch platform, contracts, authentication or data. The reviewer prompt in `phase-cycle.js` carries this package from now on.

## Package D: shorter review rounds

- The reviewer receives the diff, the previous findings and `rule-checks.md`. It does not re-check what a green gate already proves, and it spends the round on design, behaviour and impact.
- The F12 plan splits its work into smaller cycles, each with one PR, so every review covers a narrower diff.

## Acceptance

- The affected tests pass with the shared servers and the templates.
- Every guard of package B fails on a fixture that has the violation and passes on the repository.
- `rule-checks.md` covers every rule.
- The workflow gate, pre-commit and CI all run the guards.
- The reviewer prompt asks for the impact map. A dry review of the 2b diff produces one.
