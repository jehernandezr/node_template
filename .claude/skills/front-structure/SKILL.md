---
name: front-structure
description: 'Folders, packages, microfrontends, lib/src layers and dependency rules of the front. Use it when creating or moving packages, files or tests.'
paths:
  - 'front/**/pubspec.yaml'
  - 'front/**/lib/*.dart'
  - 'front/tools/**'
---

# Front structure

## Workspace

- `front/` is a single pub workspace: dependencies are resolved once in `front/` and there is a single `package_config.json`. Each package declares `resolution: workspace`. <!-- id: front-structure.1 -->
- External dependency versions are exact, and one is added only when Flutter or Dart do not cover the need. Before adding one, write in the PR why reimplementing it would be unwise or costly. <!-- id: front-structure.2 -->
- Nx orchestrates the front targets (`format-check`, `analyze`, `test`) with the in-house plugin. <!-- id: front-structure.3 -->

## Folders

```
front/
├── apps/            web and mobile: only each platform's shell and its frame
├── packages/        api, auth, contracts, i18n, shell_core, shell_host, test_utils, tokens, ui, utils
├── microfrontends/  account, assistant, backoffice, billing, notifications, tasks, verifier
└── tools/           contracts_gen, new_microfrontend and the CI checks
```

- Inside each package or microfrontend, public code goes in `lib/<package>.dart` and private code in `lib/src/`. What is in `lib/src` is not imported from another package (Dart convention). <!-- id: front-structure.4 -->
- `lib/<package>.dart` exports with `export 'src/x.dart' show A, B;` only what other packages need. Exporting a whole file leaks implementation details. <!-- id: front-structure.5 -->
- Test doubles and utilities used by several packages live in the `front/packages/test_utils` package, which is only declared in `dev_dependencies`. No package exposes a `lib/testing.dart` or a `testing/` folder. <!-- id: front-structure.6 -->
- `test_utils` exports `TestApp`, `SessionBuilder`, `ProblemFixtures`, `TestScope`, `FakeClock`, `FakeFailure`, `FakeAuthRepository`, `expectAccessible`, `pumpAtWidths`, `pumpAtTextScale` and `DeferredLibrariesPreloader`. Each piece and how to use it is in `front-testing`. <!-- id: front-structure.7 -->
- `tools/new_microfrontend.dart` creates a new microfrontend with its structure and its test. See the `front-new-microfrontend` skill. <!-- id: front-structure.8 -->

## Layers inside a microfrontend

A microfrontend organizes `lib/src` by layer. Dependencies go one way: `screens` knows `data` and `shared`, `data` knows `shared`, `shared` knows nobody.

Example in `references/examples.md`, section "Layers inside a microfrontend".

- `screens/` groups by screen, not by widget type: `tasks_list_screen.dart` and `tasks_list_controller.dart` sit together. A widget used by only one screen is private to its file or a sibling of it. <!-- id: front-structure.9 -->
- What two microfrontends need is neither copied nor imported from the other: it moves up to `front/packages` (`ui` for widgets, `utils` for pure functions, `tokens` for design). <!-- id: front-structure.10 -->
- `check_microfrontend_boundaries` checks these boundaries in CI. If a rule gets in the way, discuss ADR 0018; do not work around it. <!-- id: front-structure.11 -->

## Shared packages

- `ui` knows no microfrontend and no domain. `tokens` depends on nothing. `contracts` is generated: it is not edited by hand. <!-- id: front-structure.12 -->
- A package exposes ports (abstract classes) and adapters. API adapters use `ApiClient`; demo adapters live next to the port, in `data/`. <!-- id: front-structure.13 -->
- The theme and design values come from `tokens` and `ui` (see `front-adaptive-layout`). <!-- id: front-structure.14 -->

## Build

- `flutter build` leaves its output in each app's `build/`, which is in `.gitignore`. Source code never lives next to build artifacts. <!-- id: front-structure.15 -->
- Generated code (`l10n/generated`, `contracts`) is not edited by hand and is regenerated with its tool (`flutter gen-l10n`, `contracts_gen`). <!-- id: front-structure.16 -->

## File and class names

- snake_case with the role in the name: `tasks_list_controller.dart`, `api_tasks_repository.dart`, `tasks_list_screen.dart`, `task_detail_view.dart`. <!-- id: front-structure.17 -->
- One file, one main public class. Private helper classes may go in the same file. <!-- id: front-structure.18 -->
- The class has the same role as the file: `TasksListController`, `ApiTasksRepository`, `FakeTasksRepository`, `TasksListScreen`. <!-- id: front-structure.19 -->
- Constants are grouped in `abstract final class` classes (`TasksPaths`, `AppSpacing`), not as a cloud of loose constants. <!-- id: front-structure.20 -->
- `Fake` prefix for the in-memory adapter, `Api` for the one that talks to the server. No `Impl` suffixes. <!-- id: front-structure.21 -->

## With pstack

Method in `pstack-in-node-template`. The pstack skills that apply here: `how`, `why`, `principle-encode-lessons-in-structure`, `principle-migrate-callers-then-delete-legacy-apis`.
