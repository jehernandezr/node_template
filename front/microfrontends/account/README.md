# mf_account

Microfrontend de la cuenta del usuario, para web y móvil. Todas las rutas viven bajo `/account`.

- `/account`: resumen del perfil y enlaces a las secciones.
- `/account/sessions`: sesiones activas, cierre remoto y cierre de las demás.
- `/account/devices`: dispositivos de confianza, con el verificador marcado.
- `/account/security`: MFA, passkeys y códigos de recuperación. Las acciones sensibles piden un segundo factor reciente con el step-up del shell (`ShellServices.requestStepUp`); la cuenta no verifica códigos por su cuenta.
- `/account/agreements`: acuerdos pendientes de aceptar e historial.

## Estructura

- `lib/mf_account.dart`: exporta `accountManifest`. Solo importa `shell_core`, `go_router`, `material_ui` y la librería diferida de pantallas. Las rutas reciben `load` y `scope`; las secciones son hijas de `/account`.
- `lib/src/screens/screen_builders.dart`: funciones `buildAccount*Screen(MicrofrontendScope)`. Obtienen el `AccountRepository` del scope (`scope.get`), envuelven la pantalla con `Localizations.override` y, en el resumen, pasan `scope.services.signOut`.
- `lib/src/data/`: `AccountRepository` (abstracto) y `FakeAccountRepository` con datos de ejemplo. Aún no hay llamadas al backend.
- `lib/src/screens/`: pantallas, reunidas en `screens.dart`. Cada pantalla tiene su `AppBar`.
- `lib/src/screens/widgets/`: componentes compartidos de las pantallas y `step_up.dart`, que pide el step-up al shell cuando `accountStepUpRule` no se cumple.
- `lib/src/shared/constants/`: ruta base, tamaños y `accountStepUpRule` (ventana de `MfaRules.stepUpMaxAgeMinutes`). Es lo único, junto con `shared/enums`, que el manifiesto carga de entrada.
- Las fechas se muestran con `formatDate` y `formatDateTime` de `packages/utils`, en el locale y la zona horaria del usuario.
- `lib/src/l10n/`: textos propios en `app_es.arb` (plantilla) y `app_en.arb`. Las palabras compartidas (cancelar, reintentar, confirmar, cerrar, cargando, cerrar sesión y errores) salen de `AppLocalizations` del paquete `i18n`.
  - Tras cambiar los ARB, ejecuta `flutter gen-l10n` y versiona `lib/src/l10n/generated/`.

## Pruebas

```sh
flutter gen-l10n && flutter analyze && flutter test
```
