---
name: pstack-in-node-template
description: 'How to work here with the pstack plugin: loading its skills in Claude Code, work order, verification, interrogate and precedence. Use it before following a pstack skill.'
---

# pstack in node_template

The method comes from pstack and the rules from the `backend-*` and `front-*` skills. If the plugin is not installed, continue with the repository skills only and do not install it yourself.

## Loading a pstack skill

1. Find the plugin: `ls -d ~/.claude/plugins/cache/cursor-plugins/pstack/*/ | sort -V | tail -1` (that is `<pstack>`).
2. Once per session, read `<pstack>/docs/harness/claude-code.md`, which maps Cursor names to Claude Code (`Task` is `Agent`, `readonly` is `Explore`, models and paths).
3. Read `<pstack>/skills/<name>/SKILL.md` with `Read` and follow it. The `Skill` tool rejects them. To a person, say `/pstack:<name>`.
4. Cursor-only steps (Bugbot, automations, `/deslop`) are skipped with `Skipped in Claude Code: <step>. <reason>.`
5. Models per role come from `~/.claude/rules/pstack-models.md`; change them with `/pstack:setup-pstack`.

## How work is done

1. Pick the `poteto-mode` playbook: `feature`, `bug-fix`, `refactoring` or `perf-issue`.
2. Non-trivial code: `architect` fixes ports, types, enums and modules, and leaves them compiling.
3. Verifiable units (`principle-sequence-verifiable-units`): each one compiles, has green tests and its own commit. A bug starts with `tdd`.
4. `principle-prove-it-works` with the commands under "Verification".
5. Review: `interrogate` over `main...HEAD`, then `no-comments`, and `blast-radius` if it touches platform, contracts, authentication or data. The rules are the "Review rules" of `backend-code` or `front-code` plus those of the topic skill.
6. Docs, ADRs, commits and PRs go through `unslop`.

## Verification

- Backend: `node .claude/skills/backend-structure/scripts/check-structure.mjs --changed .`, `pnpm nx run-many -t lint test typecheck --projects=<touched and dependents>` and `pnpm nx format:check`. Integration with `INTEGRATION_TESTS=require` and `--runInBand`, one project at a time.
- Contracts: `pnpm nx run contracts-export:check` and `(cd front/packages/contracts && dart run contracts_gen --check)`.
- Front: `node .claude/skills/front-structure/scripts/check-structure.mjs --changed .` and, per package, `format-check`, `analyze` and `test`; in a microfrontend, `dart run tools/check_microfrontend_boundaries.dart`.
- Across services: `pnpm nx run platform-flow:e2e`.

## `interrogate` here

- Adversaries from the `interrogate reviewers` line, each in its own worktree, with the area's review rules.
- A finding counts only if a run proves it. Without a run it is a hypothesis and does not block.
- Targeted runs (one test file or one script). The coordinator runs the full suite and reruns each finding before accepting it.
- On the 4-core Raspberry Pi, only one heavy command at a time. Clean containers only with `--filter label=org.testcontainers=true`.

## Precedence

When they disagree, the repository wins:

- Business logic in framework-free domain classes, not in loose functions.
- No inline comments; a complete, concise JSDoc on every public method (`///` in Dart). Reject Comment Sicko removing that JSDoc.
- English only in docs, ADRs, PRs, commits and JSDoc, without em dashes; from `technical-writing`, only the structure.
- Conventional Commits in English, no AI attribution, never `--no-verify`; PRs follow `.github/pull_request_template.md`.
- Port fakes as classes, without `jest.fn`.
- Enums instead of literals and ports as abstract classes, even if `typescript-best-practices` says otherwise.
- Inside a `.claude/workflows/phase-cycle.js` cycle, its rules win over `autonomous-run`, `autopilot-*` and `shipping`.
