# 0027. Patrones de pantalla y pruebas compartidas del front

- Estado: Aceptada
- Fecha: 2026-11-14
- Relacionados: [ADR 0012](0012-front-flutter-shells-microfrontends.md), [ADR 0015](0015-estructura-backend-front-y-codigo-compartido.md), [ADR 0018](0018-contrato-de-microfrontend.md)

## Contexto

El front tenía `Clock` en `auth` y cinco copias de `DateTime Function()`, 24 clases `State` en microfrontends con 51 llamadas a `widget.repository.`, el estado de carga y de acción repetido en cada pantalla, siete helpers `_localized`, seis fakes con latencia propia y siete harness de prueba casi iguales. Cada pantalla resolvía por su cuenta la carga, los errores, las acciones y el reloj, así que una corrección en un lugar no llegaba a los demás. Hacía falta fijar los patrones antes de migrar las pantallas, para que el código nuevo nazca con ellos y las reglas del script lo protejan desde el primer día.

Cada pantalla que se escriba sin estos patrones agrega una copia más que luego habría que migrar, por eso la decisión se toma antes de que crezca el número de pantallas.

## Decisión

- `Clock` (typedef `DateTime Function()`) y `systemClock` en `utils`, único lugar con `DateTime.now()`; `AccessRule` recibe `now` obligatorio y deja de leer el reloj.
- `AsyncValue` en `ui` con `guard` que atrapa solo `Exception`; `AsyncLoader` y `ActionRunner`; `ActionResult` con tres desenlaces (`ActionSucceeded`, `ActionFailed`, `ActionSkipped`) y `ActionConcurrency`; `ControllerBuilder` en `ui` crea y cierra el controlador.
- Un `XController extends ChangeNotifier` por pantalla con estados sellados, como `SessionsController`, y pantallas `StatelessWidget` que lo reciben con `ControllerBuilder`.
- `StatusColors` como `ThemeExtension` en `ui` y el token `info` en `tokens`.
- `ErrorDetails` y `ErrorPresenter` viven en `i18n`, que pasa a depender de `contracts` para mapear cada código de error a texto; `ui` muestra solo un `ErrorDetails` y deja de depender de `contracts`.
- `DeferredLibraryLoader` con caché por instancia, que reemplaza al mapa global de librerías cargadas.
- `ScreenRoute.deferred` declara una pantalla diferida en tres líneas en lugar de seis.
- `DeferredLocalizations` y `showLocalizedDialog` para que los diálogos reapliquen los delegados de localización de su pantalla.
- `RepositoryBinding` declara, por microfrontend, cómo se crea su repositorio en modo demo y en modo real.
- `DemoBehavior` concentra la latencia, los fallos programables y el cierre de los fakes.
- `StepUpGate` vive en `account`, que es el único microfrontend que pide step-up.
- `ShellNavigator` y `ShellRouterFactory` en `shell_core` reemplazan a las funciones sueltas de navegación y construcción del router.
- `ShellHost` se divide en `MenuBadges`, `SessionBinding`, `ShellRoutes`, `ShellDestination`, `ShellMenuModel` e `IdentityConnectionFactory`, y conserva su constructor actual como fábrica.
- `MfaState` sellado en `auth` (`MfaStep`, `MfaBusy`, `MfaFailed`) reemplaza las banderas sueltas de `MfaFlow`.
- `test_utils` agrega `TestApp`, `FakeClock`, `SessionBuilder`, `ProblemFixtures`, `TestScope`, `DeferredLibrariesPreloader` y las ayudas `expectAccessible`, `pumpAtWidths` y `pumpAtTextScale`.
- La suite compartida de escenarios de shell vive en `packages/test_utils/lib/src/shell/scenarios/` con `ShellFixture`, `ShellScenarioSetup` y `ShellUnderTest`; cada app implementa su fixture.
- `check-structure.mjs` del front suma reglas sobre colores, `catch` sin `on` (salvo la marca `// catch-all:`), `Text('` y `widget.repository.` en pantallas, direccionalidad, interpolación de `l10n`, `DateTime.now()` y versiones con `^`, con línea base en `front/tools/structure-baseline.json`.
- Versiones exactas: cada `pubspec.yaml` fija el número exacto y el script lo vigila, porque pub no tiene un catálogo único de versiones.
- Tamaño mínimo: 48 de alto en todos los botones y campos del tema.
- Orden de migración: primero lo aditivo; lo legado no lleva `@Deprecated`, lleva un comentario `/// Legacy` y se retira en una fase propia al final.
- `front/tools/new_microfrontend.dart` crea un microfrontend nuevo. Sus plantillas viven en `front/tools/new_microfrontend/templates/` como archivos `.tmpl`, que el formateador y el analizador no leen. El generador es un paquete del pub workspace con pruebas propias; formatea el paquete que crea y no edita las apps, solo imprime las dos piezas que cada app necesita. La skill `front-nuevo-microfrontend` describe su uso.

## Consecuencias

### Positivas

- Las pantallas no guardan estado propio, y los controladores se prueban sin widgets.
- Hay una sola fuente del reloj, y las pruebas de shell se comparten entre las dos apps.
- Las reglas nuevas del script protegen el código nuevo desde el primer día.
- Un cambio de comportamiento compartido, como la latencia de los fakes o los estados de carga, se hace en un solo lugar y lo ven las dos apps.

### Costos

- La API vieja y la nueva conviven hasta el retiro, y `i18n` pasa a depender de `contracts`.
- Los botones de 48 de alto también aparecen en escritorio.
- La línea base de `check-structure.mjs` hay que vaciarla y borrarla al final.
- Las plantillas `.tmpl` no pasan por el formateador ni por el analizador: su calidad la cubren las pruebas del paquete del generador y un microfrontend de prueba que se genera, se valida y se borra en cada cambio de plantilla.
- Cada controlador es una clase más por pantalla, a cambio de pruebas que no necesitan widgets.
- Endurecer `analysis_options.yaml` queda fuera de esta decisión, como cambio aparte.

## Alternativas consideradas

- `useRootNavigator: false` para los diálogos: un diálogo es una ruta hermana de la página y no hereda el `Localizations.override`, así que no resuelve el problema.
- Un solo catálogo de versiones en el pub workspace: pub no lo ofrece.
- Aceptar `^` en la skill `front-estructura`: se descartó para fijar las versiones exactas.
- Un paquete `errors` aparte: es más limpio, pero agrega un miembro más al workspace.
- Un `State` mínimo por pantalla en lugar de `ControllerBuilder`: obliga a repetir `initState` y `dispose` en cada pantalla.
- Dos desenlaces de acción en lugar de tres: no distinguen "no corrió" de "falló".
- La suite de escenarios en `shell_host/test`: un paquete no puede importar el `test/` de otro.
- `StepUpGate` en `shell_core`: solo `account` lo usa hoy; si otro microfrontend lo necesita, sube sin cambiar su firma.
- Reglas del script al final en lugar de con línea base: nada protegería el código escrito mientras tanto.
- Plantillas como cadenas en código Dart: el código de generación se vuelve ilegible y las plantillas no se leen ni se revisan como archivos.
- Un script suelto, sin paquete ni pruebas: nada lo protege cuando cambia el contrato del microfrontend.
