# mobile_shell

Shell móvil de Flutter. Compone los microfrontends que declaran `AppPlatform.mobile` sobre `shell_host`.

## Cómo está armado

- `lib/main.dart` arranca `ShellHostApp` con el `ShellHost` de `buildMobileHost`. Con `--dart-define=API_BASE_URL=...` le pasa la conexión real de `lib/src/config.dart`.
- `lib/src/mobile_shell.dart`: `mobileManifests` (`account`, `tasks`, `notifications`, `assistant`, `verifier`), los perfiles de demostración y el marco.
- `lib/src/shell/mobile_shell_scaffold.dart`: `ShellChrome` sin barra superior propia. Más de cinco destinos se agrupan bajo "Más". Etiqueta, icono e insignia salen de la `MenuEntry` de cada manifiesto.
- `lib/src/deep_links/deep_link_mapper.dart`: reconoce el esquema propio y el host web, y deja que el manifiesto del segmento (`MicrofrontendManifest.deepLinks`) decida a qué ruta lleva el resto del enlace. Aún no está conectado a un plugin de enlaces.

Sesión, login, paso adicional, `/forbidden`, router, insignias y modo demo o vivo son de `shell_host`.

## Sesión real

Hasta que existan los adaptadores de Keychain/Keystore y de Secure Enclave, el session token vive en memoria (`InMemoryTokenStore`) y el login no registra el dispositivo: no hay clave de dispositivo con API real.

## Verificación

```sh
flutter analyze
flutter test
```
