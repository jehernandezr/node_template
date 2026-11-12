# mf_verifier

Microfrontend del verificador de dispositivo. Un dispositivo registrado muestra
el código de 8 dígitos de un intento de login desde un dispositivo nuevo, con
su contexto, una cuenta regresiva y la acción "No fui yo".

- Manifest: `verifierManifest` (`lib/mf_verifier.dart`), rutas bajo `/verifier`, solo móvil.
  Las rutas reciben `(load, scope)`: el repositorio no es global, se obtiene del scope de la identidad.
- Pantalla: `lib/src/screens/verifier_screen.dart`, cargada con `deferred`. `buildVerifierScreen(scope)`
  crea el repositorio con `scope.get` (un repositorio por usuario y tenant) y lo cierra al hacer dispose.
- Datos: `VerifierRepository` (`lib/src/data/`). Hoy solo existe `FakeVerifierRepository`;
  el adaptador real de la API llega después.
- Textos: `lib/src/l10n/app_es.arb` (plantilla) y `app_en.arb`, generados en
  `lib/src/l10n/generated/` (clase `VerifierLocalizations`). Las palabras compartidas
  (p. ej. `actionCancel`) salen de `AppLocalizations` del paquete `i18n`.
  Para regenerar: `flutter gen-l10n`.

## Clave del dispositivo

La clave del dispositivo es el puerto `DeviceKeyPort` de `auth`. La pantalla lo obtiene de los
extras del shell con `scope.services.extra<DeviceKeyPort>()` y lo pasa al repositorio; si el shell
no lo provee, usa `FakeDeviceKeyPort` de `auth`. El adaptador real (Secure Enclave, Keystore o
WebCrypto) lo registra el shell, así que este paquete no cambia cuando llegue.

Comprobaciones: `flutter gen-l10n && flutter analyze && flutter test`.
