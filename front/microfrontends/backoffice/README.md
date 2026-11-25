# mf_backoffice

Platform backoffice microfrontend. Web only and only for platform roles (`PlatformRole`) with a recent second factor. It follows the microfrontend contract of [ADR 0018](../../../docs/adr/0018-microfrontend-contract.md).

## Routes

The manifest declares `screens: [ScreenRoute(...)]` nested under `/backoffice`. Each screen owns its single top bar (`AppPage`); section navigation goes inside the page.

| Route | Screen | Extra access |
| --- | --- | --- |
| `/backoffice` | Summary: tenants, sagas that need intervention, messages in DLQ | |
| `/backoffice/tenants` | List with search, region and status filters | |
| `/backoffice/tenants/:id` | Detail: plan, shard group, users and audit | |
| `/backoffice/sagas` | List with status filter; those that need intervention are highlighted | operations readers |
| `/backoffice/sagas/:id` | Timeline of steps, manual actions and audit | (inherits) |
| `/backoffice/dlq` | Dead-letter queues | operations readers |
| `/backoffice/dlq/:queue` | Messages of a specific queue, with redrive | (inherits) |

## Access

The rules live in `lib/src/shared/constants/backoffice_access.dart`:

- **Manifest:** `AccessRule.all([platformRoles(all), mfa(backofficeMfaMaxAge)])`, with the contract's step-up window (`MfaRules.stepUpMaxAgeMinutes`). A platform role without a recent second factor goes to the shell's step-up page; a user without a platform role goes to `forbidden`.
- **Operations read** (sagas and DLQ): `superAdmin`, `support` and `readOnly`, with `ScreenRoute(access:)`. `finance` only sees the billing part: the summary with the tenants card and the tenants with their plan.
- **Actions** (manual saga actions and DLQ redrive): only `superAdmin` and `support`, with `AccessGate`. For the other roles the buttons do not appear.

The interface only hides; the API checks every request again.

## Deferred loading

`lib/mf_backoffice.dart` is the manifest and loads with the shell. It imports `shell_core`, the constants in `src/shared/constants` and, as a deferred import, `src/screens/screens.dart`. Nothing in `src/{data,screens,l10n}` may be reachable from the manifest without `deferred as`: clients would download it and the backoffice ARB texts would appear in `main.dart.js` (checked by `front/tools/check_deferred_chunks.dart`). `front/tools/check_microfrontend_boundaries.dart`, which runs in `analyze`, walks the manifest's import graph and enforces this rule.

`src/screens/screens.dart` exposes one entry point per screen (`overviewPage(scope)`, `dlqPage(scope, queue: ...)`, ...), without `BuildContext`. Each one gets the repository from the `MicrofrontendScope` of the current identity and wraps the screen in `BackofficeLocalized`, which adds `BackofficeLocalizations.delegate`. Dialogs open with `showBackofficeDialog`, because they live in the root navigator, outside the page.

## Structure

```
lib/src/
  shared/
    enums/      TenantStatus, TenantRegion, SagaStatus, ... (not yet in package:contracts)
    constants/  routes (BackofficePaths) and access rules
    types/      read models (Tenant, Saga, AuditEntry, ...)
    utils/      formatTimestamp
  data/         BackofficeRepository (interface, ScopedResource) and FakeBackofficeRepository
  screens/      screens and common widgets (BackofficePage, AsyncBody, AuditTimeline)
  l10n/         ARB, generated code and enum labels
```

## Data

`BackofficeRepository` is the contract and implements `ScopedResource`: the scope creates it with `scope.get(...)` and releases it when the identity changes. `FakeBackofficeRepository` keeps the data in memory, one instance per identity, and throws `ApiErrorException` with codes from `PlatformErrorCode`. `package:contracts` does not publish the backoffice operations yet; when it does, the real implementation will use `ApiClient` from `package:api` and the generated enums will replace the ones in `shared/enums`.

Loading, error and data states are shown with `AsyncValueView`; action errors, with `showActionError` from `package:ui`.

## Localization

- `l10n.yaml` generates `BackofficeLocalizations` from `lib/src/l10n/app_es.arb` (template) and `app_en.arb`, into `lib/src/l10n/generated/`. The generated code is committed.
- Shared words (cancel, confirm, retry, platform errors) come from `AppLocalizations` in the `i18n` package.
- Enum labels live in `lib/src/l10n/backoffice_labels.dart`.

## Tests

```sh
flutter gen-l10n && flutter analyze && flutter test
```

The tests mount the real routes with `backofficeManifest.buildRoutes(...)` (or with `buildShellRouter` for the manifest's access) and cover the manifest, the deferred boundary, scope isolation, l10n in es and en, states and access per role.
