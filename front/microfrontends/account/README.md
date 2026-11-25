# mf_account

Microfrontend for the user's account, for web and mobile. All routes live under `/account`.

- `/account`: profile summary and links to the sections.
- `/account/sessions`: active sessions, remote sign-out and sign-out of the others.
- `/account/devices`: trusted devices, with the verifier marked.
- `/account/security`: MFA, passkeys and recovery codes. Sensitive actions ask for a recent second factor with the shell's step-up (`ShellServices.requestStepUp`); the account does not verify codes on its own.
- `/account/agreements`: agreements pending acceptance and history.

## Structure

- `lib/mf_account.dart`: exports `accountManifest`. It only imports `shell_core`, `go_router`, `material_ui` and the deferred screens library. Routes receive `load` and `scope`; the sections are children of `/account`.
- `lib/src/screens/screen_builders.dart`: `buildAccount*Screen(MicrofrontendScope)` functions. They get the `AccountRepository` from the scope (`scope.get`), wrap the screen with `Localizations.override` and, in the summary, pass `scope.services.signOut`.
- `lib/src/data/`: `AccountRepository` (abstract, with its `capabilities`), `FakeAccountRepository` (demo mode, with sample data) and `ApiAccountRepository` (live mode). The real one only serves what has an `identity` contract, sessions and devices; profile, device trust, security and agreements throw `UnsupportedError`, and the screens do not offer them or show them as unavailable.
- `lib/src/screens/`: screens, gathered in `screens.dart`. Each screen has its own `AppBar`.
- `lib/src/screens/widgets/`: components shared by the screens and `step_up.dart`, which asks the shell for step-up when `accountStepUpRule` is not met.
- `lib/src/shared/constants/`: base route, sizes and `accountStepUpRule` (window of `MfaRules.stepUpMaxAgeMinutes`). Together with `shared/enums`, it is the only thing the manifest loads upfront.
- Dates are shown with `formatDate` and `formatDateTime` from `packages/utils`, in the user's locale and time zone.
- `lib/src/l10n/`: own texts in `app_es.arb` (template) and `app_en.arb`. Shared words (cancel, retry, confirm, close, loading, sign out and errors) come from `AppLocalizations` in the `i18n` package.
  - After changing the ARB files, run `flutter gen-l10n` and commit `lib/src/l10n/generated/`.

## Tests

```sh
flutter gen-l10n && flutter analyze && flutter test
```
