---
name: front-analysis
description: 'Analyzer, lints, formatting and suppressions for the Dart front. Use it when configuring analysis_options or fixing warnings.'
paths:
  - 'front/**/analysis_options.yaml'
  - 'front/**/pubspec.yaml'
---

# Static analysis and documentation

## Current state and goal

Each package has its own `analysis_options.yaml` with `include: package:flutter_lints/flutter.yaml` and the platform directories excluded. The goal is to tighten it, done as a change of its own with every package green, not mixed with a feature:

Example in `references/examples.md`, section "Current state and goal".

- `flutter_lints` already brings `avoid_print`, `prefer_const_constructors` and `use_build_context_synchronously`; the list above adds what it lacks. With `include`, a list of rules in `linter.rules` adds; to turn one off, use the map format (`rule: false`). Do not mix list and map in the same block.
- `public_member_api_docs` applies to the shared packages (`front/packages`) and is left out of a microfrontend's private screens.
- No `// ignore:` without its reason on the same line, and always for the specific code (`// ignore: use_build_context_synchronously -- the dialog checks mounted first`), never `ignore_for_file: type=lint`. The analyzer reads the codes before `--` and the structure check requires the reason after it. Generated code is excluded in `analyzer.exclude`.

## Before calling a change done

1. `dart format` on what you touched (Nx `format-check` verifies it).
2. `dart analyze` for the package, or Nx `analyze`. Zero warnings, including `info`; with `--fatal-infos` to enforce it.
3. `dart fix --dry-run` and, if the fixes are the expected ones, `dart fix --apply`, then analyze again.
4. `flutter test` for the package.
5. For a microfrontend, `dart run tools/check_microfrontend_boundaries.dart`.

## Documentation with `///`

The rules are in `front-code`, section "Documentation with `///`".

## With pstack

Method in `pstack-in-node-template`. The pstack skills that apply here: `principle-encode-lessons-in-structure`, `correct`, `no-comments`, `unslop`, `principle-prove-it-works`.
