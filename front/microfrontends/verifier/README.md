# mf_verifier

Microfrontend del verificador de dispositivo. Un dispositivo registrado muestra
el código de 8 dígitos de un intento de login desde un dispositivo nuevo, con
su contexto, una cuenta regresiva y la acción "No fui yo".

- Manifest: `verifierManifest` (`lib/mf_verifier.dart`), rutas bajo `/verifier`, solo móvil.
  La ruta carga la pantalla con `deferred` y recibe el scope de la identidad.
- Entrada: `VerifierScreens.main(scope)` (`lib/src/screens/verifier_screens.dart`). Obtiene el
  repositorio con `scope.repository(VerifierData.repository)`: un repositorio por usuario y
  tenant, que el scope cierra al terminar.
- Datos: `VerifierData` (`lib/src/data/verifier_data.dart`) entrega `VerifierRepository`. Hoy
  solo existe `FakeVerifierRepository`, que solo sirve en modo demo; el adaptador real de la
  API llega después.
- Controlador: `VerifierController` (`lib/src/screens/verifier_controller.dart`) sigue el reto
  pendiente, deniega y expone un estado sellado `VerifierState`
  (`lib/src/screens/verifier_state.dart`): cargando, sin reto, reto, denegando, bloqueado o
  fallido. La pantalla solo dibuja ese estado.
- Cuenta regresiva: los segundos salen de la hora de expiración del reto, leída del `Clock`
  del `ShellAccessScope`, no de un contador. Un salto del reloj se ve en el siguiente tick.
- Accesibilidad: el código se lee dígito a dígito (`spokenCode`). `VerifierAnnouncer` anuncia
  dos veces por reto: a los 10 segundos y al caducar. La cuenta regresiva no se anuncia cada
  segundo.
- Textos: `lib/src/l10n/app_es.arb` (plantilla) y `app_en.arb`, generados en
  `lib/src/l10n/generated/` (clase `VerifierLocalizations`). Las palabras compartidas
  (p. ej. `actionCancel`) salen de `AppLocalizations` del paquete `i18n`.
  Para regenerar: `flutter gen-l10n`.

## Clave del dispositivo

La clave del dispositivo es el puerto `DeviceKeyPort` de `auth`. El verificador solo sirve el
modo demo (`modes: {ShellMode.demo}`): los desafíos de login aún no tienen contrato, así que el
repositorio en memoria firma con `DemoDeviceKey`, que nunca llega a un servidor real. Cuando haya
contrato, el repositorio real recibirá el adaptador del shell (Secure Enclave, Keystore o
WebCrypto) y el manifiesto declarará también `ShellMode.live`.

El manifiesto acepta el enlace `verifier?challenge=<id>` (`deepLinks`).

Comprobaciones: `flutter gen-l10n && flutter analyze && flutter test`.
