---
name: front-new-microfrontend
description: 'Create a microfrontend with front/tools/new_microfrontend.dart and what is written by hand. Use it when creating or reviewing a new microfrontend.'
paths:
  - 'front/tools/new_microfrontend/**'
  - 'front/microfrontends/*/lib/*.dart'
---

# New microfrontend

The generator creates the structure and the glue. What remains is the domain: the repository port, one controller and one screen per route, the texts and the tests. The rules for each piece are in `front-code`, `front-testing`, `front-i18n` and `front-accessibility`.

## Command

```bash
dart run front/tools/new_microfrontend.dart reports --menu "Reportes" [--menu-en "Reports"] [--no-install]
```

- The id is lowercase, 2 to 24 characters (`^[a-z][a-z0-9]{1,23}$`). It is the first segment of the routes.
- `--menu-en` is optional; it defaults to the id with an initial capital.
- `--no-install` skips the three install steps below.

## What it creates

In `front/microfrontends/reports`:

- `.gitignore`, `analysis_options.yaml`, `l10n.yaml` and `README.md`.
- `pubspec.yaml` (`mf_reports`, with exact versions) and `lib/mf_reports.dart`, with `reportsManifest`: the list route, the child detail route and the `ReportsAccess.read` access rule.
- `lib/src/shared/`: `constants/reports_paths.dart` (`reportsId`, `reportsMenuLabel` and `ReportsPaths`), `constants/reports_access.dart` (`ReportsAccess.read = AccessRule.authenticated()`) and `constants/reports_demo.dart`; `enums/reports_operation.dart`; `types/reports_item.dart` and `types/reports_not_found_exception.dart`.
- `lib/src/data/`: `reports_repository.dart` (the port), `fake_reports_repository.dart` with `DemoBehavior`, and `reports_data.dart` with `RepositoryBinding.demoOnly`.
- `lib/src/screens/`: `reports_list_controller.dart` and `reports_detail_controller.dart` with `AsyncLoader`; `reports_list_screen.dart` and `reports_detail_screen.dart` with `ControllerBuilder`; `reports_screens.dart` with the static `ReportsScreens` and `DeferredLocalizations`; `screens.dart`.
- `lib/src/l10n/app_es.arb` and `app_en.arb`, and `test/` with `utils/reports_test_app.dart` (`ReportsTestApp`), `utils/scripted_reports_repository.dart`, `manifest_test.dart`, and tests for `data/`, `screens/` and `l10n/`.
- Adds `  - microfrontends/reports` to `front/pubspec.yaml`.

Then, unless `--no-install` is given, it runs `flutter pub get` in `front/`, and `flutter gen-l10n` and `dart format lib test` in the new package.

The generator does not edit the apps. It prints what each app needs.

## What to add by hand in each app

The generator prints three pieces for each app:

1. The import `import 'package:mf_reports/mf_reports.dart' show reportsManifest;`.
2. The line `reportsManifest,` in the list in `front/apps/web/lib/src/web_shell.dart` (`webManifests`) and in the one in `front/apps/mobile/lib/src/mobile_shell.dart` (`mobileManifests`).
3. The `mf_reports` dependency with `path: ../../microfrontends/reports` under `dependencies` in `front/apps/web/pubspec.yaml` and `front/apps/mobile/pubspec.yaml`.

## What is written by hand

- **Port and data:** the `ReportsRepository` port (an `abstract interface class` that implements `ScopedResource`) and `FakeReportsRepository` with `DemoBehavior` for latency and failures. The demo data is `FakeReportsRepository.demoItems`; `reports_demo.dart` only holds the latency. A real repository does not exist until there is a contract.
- **Controllers:** one per screen, with an `AsyncLoader` for each load and an `ActionRunner` if it writes, both listened to with `addListener(notifyListeners)` and released in `dispose`. `start` loads and also serves as retry. No `State` with a `Future`, no logic `try/catch`.
- **Screens:** one per route, a `StatelessWidget` with `ControllerBuilder`, with the four states.
- **Texts:** the new keys in `app_es.arb` and `app_en.arb`, with placeholders.
- **Tests:** controllers without widgets, screens with the four states, compact and expanded widths, `expectAccessible` and 2x scale.
- **Access:** `AccessRule.permissions([...])` with the real `Permission` once it exists. Today `ReportsAccess.read` uses `AccessRule.authenticated()`, because `Permission` has no reports permission.
- **Writes:** if there are actions that change data, `ActionRunner`. A sensitive action is protected with `AccessRule.mfa` and `context.can`, or with `scope.services.requestStepUp()` when the session does not meet it.
- **Deep links:** `deepLinks` in the manifest, only if needed.

## Pieces

- Manifest: where: `lib/mf_reports.dart`; what it does: id, platforms, modes, access, menu and deferred routes
- Route constants: where: `lib/src/shared/constants/`; what it does: `ReportsPaths.list`, `ReportsPaths.detail(id)`, `idParam` and `idSegment`
- Port and demo data: where: `lib/src/data/`; what it does: `ReportsRepository`, `FakeReportsRepository`, `ReportsData.repository`
- Controller: where: `lib/src/screens/*_controller.dart`; what it does: state with `AsyncLoader`, actions with `ActionRunner`
- Screen: where: `lib/src/screens/*_screen.dart`; what it does: `ControllerBuilder` and `AsyncValueView`, no logic
- Screens bridge: where: `lib/src/screens/reports_screens.dart`; what it does: static `ReportsScreens`, with `DeferredLocalizations` and `scope.repository`
- Texts: where: `lib/src/l10n/*.arb`; what it does: `ReportsLocalizations`, with placeholders

## Manifest and bridge outline

Same as `tasks` (`mf_tasks.dart`). The manifest only imports constants, enums and the bridge, with `deferred as`:

Example in `references/examples.md`, section "Manifest outline".

The bridge is a static class. `DeferredLocalizations` loads the delegates with the screen, and the repository comes from the microfrontend's binding:

Example in `references/examples.md`, section "Bridge outline".

## Reviewer checklist

- No screen has a `State` with a `Future`, a `try/catch` or `widget.repository.`.
- Every controller uses `AsyncLoader`, and `ActionRunner` if it writes. Its test does not mount widgets.
- Every screen has a test for its four states, one compact and one expanded width, `expectAccessible` and a test at 2x scale.
- Colors from `Theme` and `context.statusColors`; texts from the ARB with placeholders; `AlignmentDirectional` and `EdgeInsetsDirectional`.
- Dialogs with `context.showLocalizedDialog`.
- `check_microfrontend_boundaries` and `check_deferred_chunks` green.
- Acceptance: `pnpm nx run-many -t format-check analyze test --projects=front-mf_<id> --skip-nx-cache`.

## Changing the generator

The templates live in `front/tools/new_microfrontend/templates/` as `.tmpl` files, with the markers `{{id}}`, `{{Pascal}}`, `{{menuEs}}`, `{{menuEn}}`, `{{menuEsJson}}` and `{{menuEnJson}}`. An unknown marker makes the generator fail before writing anything. The formatter and the analyzer do not read the `.tmpl` files, so every template change is checked end to end:

1. `pnpm nx run-many -t format-check analyze test --projects=front-new_microfrontend`.
2. Generate a test one (`dart run front/tools/new_microfrontend.dart reports --menu "Reportes"`) and run `pnpm nx run-many -t format-check analyze test --projects=front-mf_reports --skip-nx-cache` and `check-structure.mjs --all .`.
3. Delete `front/microfrontends/reports` and its line in `front/pubspec.yaml`, and run `flutter pub get` in `front/`. The test one is not committed.

The code rules for each piece are in [front-code](../front-code/SKILL.md), the test rules in [front-testing](../front-testing/SKILL.md), and the texts in [front-i18n](../front-i18n/SKILL.md).

## With pstack

Method in `pstack-in-node-template`. The pstack skills that apply here: `principle-build-the-lever`, `architect`, `feature`, `poteto-mode`.
