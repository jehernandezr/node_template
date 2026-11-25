# mobile_shell

Flutter mobile shell. It composes the microfrontends that declare `AppPlatform.mobile` on top of `shell_host`.

## How it is built

- `lib/main.dart` starts `ShellHostApp` with the `ShellHost` from `buildMobileHost`. With `--dart-define=API_BASE_URL=...` it passes the real connection from `lib/src/config.dart`.
- `lib/src/mobile_shell.dart`: `mobileManifests` (`account`, `tasks`, `notifications`, `assistant`, `verifier`), the demo profiles and the frame.
- `lib/src/shell/mobile_shell_scaffold.dart`: `ShellChrome` without its own top bar. More than five destinations are grouped under "Más". Label, icon and badge come from the `MenuEntry` of each manifest.
- `lib/src/deep_links/deep_link_mapper.dart`: recognizes the custom scheme and the web host, and lets the manifest of the segment (`MicrofrontendManifest.deepLinks`) decide which route the rest of the link leads to. It is not wired to a links plugin yet.

Session, login, additional step, `/forbidden`, router, badges and demo or live mode belong to `shell_host`.

## Real session

Until the Keychain/Keystore and Secure Enclave adapters exist, the session token lives in memory (`InMemoryTokenStore`) and login does not register the device: there is no device key with a real API.

## Verification

```sh
flutter analyze
flutter test
```
