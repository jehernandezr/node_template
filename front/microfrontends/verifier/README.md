# mf_verifier

Device verifier microfrontend. A registered device shows
the 8-digit code of a sign-in attempt from a new device, with
its context, a countdown and the "No fui yo" action.

- Manifest: `verifierManifest` (`lib/mf_verifier.dart`), routes under `/verifier`, mobile only.
  The route loads the screen with `deferred` and receives the identity's scope.
- Entry: `VerifierScreens.main(scope)` (`lib/src/screens/verifier_screens.dart`). It gets the
  repository with `scope.repository(VerifierData.repository)`: one repository per user and
  tenant, which the scope closes when it ends.
- Data: `VerifierData` (`lib/src/data/verifier_data.dart`) provides `VerifierRepository`. Today
  only `FakeVerifierRepository` exists, which only works in demo mode; the real API
  adapter comes later.
- Controller: `VerifierController` (`lib/src/screens/verifier_controller.dart`) follows the pending
  challenge, denies it and exposes a sealed state `VerifierState`
  (`lib/src/screens/verifier_state.dart`): loading, no challenge, challenge, denying, blocked or
  failed. The screen only draws that state.
- Countdown: the seconds come from the challenge's expiration time, read from the `Clock`
  of the `ShellAccessScope`, not from a counter. A clock jump shows on the next tick.
- Accessibility: the code is read digit by digit (`spokenCode`). `VerifierAnnouncer` announces
  twice per challenge: at 10 seconds and on expiry. The countdown is not announced every
  second.
- Texts: `lib/src/l10n/app_es.arb` (template) and `app_en.arb`, generated into
  `lib/src/l10n/generated/` (class `VerifierLocalizations`). Shared words
  (e.g. `actionCancel`) come from `AppLocalizations` in the `i18n` package.
  To regenerate: `flutter gen-l10n`.

## Device key

The device key is the `DeviceKeyPort` port from `auth`. The verifier only serves
demo mode (`modes: {ShellMode.demo}`): sign-in challenges have no contract yet, so the
in-memory repository signs with `DemoDeviceKey`, which never reaches a real server. When there is
a contract, the real repository will receive the shell's adapter (Secure Enclave, Keystore or
WebCrypto) and the manifest will also declare `ShellMode.live`.

The manifest accepts the `verifier?challenge=<id>` link (`deepLinks`).

Checks: `flutter gen-l10n && flutter analyze && flutter test`.
