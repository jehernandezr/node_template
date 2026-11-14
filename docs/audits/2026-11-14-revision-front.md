# Revisión del front de node_template

Revisión de solo lectura de `front/` (packages, microfrontends, apps y tools) contra las skills `front-*` y lo que exige el usuario. Las rutas son relativas a `/Users/jonatan/Documents/projects/node_template/front`. Esfuerzo: S (menos de medio día), M (1 a 2 días), L (más de 2 días).

## Resumen ejecutivo

El script `check-structure.mjs --all` reporta 3 incumplimientos, todos de `DateTime.now()` en la lógica: `microfrontends/account/lib/src/data/fake_account_repository.dart`, `microfrontends/tasks/lib/src/data/fake_tasks_repository.dart` y `packages/shell_core/lib/src/access_rule.dart`. Es solo la punta.

Lo que el script no ve y pesa más:

1. La regla "widgets que solo pintan" se cumple en 2 de 27 pantallas. Hay 25 clases `State` con lógica de pantalla, 51 llamadas a `widget.repository.` dentro de widgets y 24 bloques `try/catch` en `screens/`. Solo existen dos controladores (`TasksListController` y `AssistantChatController`) en todo el front.
2. Cero accesibilidad verificable: no hay un solo `Semantics` en `lib/`, solo 3 `tooltip`, y ninguna prueba usa `meetsGuideline`, escala de texto ni golden.
3. Crear un microfrontend nuevo exige copiar unos 6 bloques de código casi idénticos (`_localized`, `_repository`, `localeTag`, rutas diferidas, harness de pruebas, fake con latencia y fallos).
4. El tema descarta los roles `success` y `warning` que sí existen en `tokens`, y `billing` los redefine con colores fijos.
5. `shell_core` y `shell_host` usan funciones de nivel superior con dependencias y una caché global mutable; `ShellHost` es una clase con demasiadas responsabilidades.
6. Los textos se componen con concatenación (`'${l10n.x}: ${valor}'`) en al menos 35 sitios, contra la regla de i18n.

No revisé en profundidad: `packages/contracts` (generado), `packages/api`, `packages/ui/lib/src/layout/*` salvo `app_page` y `platform_screen`, `tokens/lib/src/scales.dart`, ni el cuerpo de `tools/contracts_gen`. Lo digo para que no se lea como "sin hallazgos".

---

## packages/ui

**U1. Alto, M. `AsyncValue` vive en un archivo de widget y su `guard` atrapa `Error`.**
`packages/ui/lib/src/components/async_value_view.dart:7-76` define el tipo de estado de todo el front dentro del archivo del widget, y `guard` (línea 36) usa `catch (error, stackTrace)` sin `on Exception`, lo que oculta errores de programación (`TypeError`, `StateError`). La skill `front-codigo` lo prohíbe.
Propuesta: mover `AsyncValue`, `AsyncLoading`, `AsyncData`, `AsyncError` a `src/state/async_value.dart` y cambiar `guard` a `on Exception`. Agregar `map`/`when` con `switch` exhaustivo en vez de `valueOrNull` por todos lados.

**U2. Alto, M. Falta el controlador genérico que evitaría 20 `State` con la misma lógica.**
Doce pantallas repiten `_load()` / `_reload()` / `if (!mounted) return; setState(...)` y solo `task_detail_view.dart:39` descarta respuestas viejas con `_requestId`. Ver el detalle por microfrontend.
Propuesta: en `ui`, una clase `final class AsyncLoader<T> extends ChangeNotifier` con constructor `AsyncLoader(Future<T> Function() load)`, `value` (`AsyncValue<T>`), `load()`, `reload()`, `_requestId` y `_disposed`. Los widgets pasan a `ListenableBuilder(listenable: loader, ...)`. Complementar con `ActionRunner` (ver U3).

**U3. Alto, M. `showActionError` y los `try/catch` de acciones están repartidos en widgets.**
`packages/ui/lib/src/components/action_error.dart:26` es una función de nivel superior que recibe `BuildContext`; cada microfrontend envuelve el mismo patrón (`runAccountAction` en `account_widgets.dart:133`, `_markOptimistically` en `inbox_screen.dart:104`, etc.).
Propuesta: clase `ActionRunner` (sin `BuildContext`) con `Future<ActionResult> run(Future<void> Function())` que devuelve un `sealed ActionResult` (`ActionSucceeded`, `ActionFailed(error)`). El controlador la usa y expone el resultado; el widget solo llama a `showActionError` cuando ve `ActionFailed`.

**U4. Alto, S. Accesibilidad de los componentes base.**

- `packages/ui/lib/src/components/loading_view.dart:20-27` y `app_button.dart:55-58`: el spinner no tiene etiqueta ni región viva; un lector de pantalla no anuncia "cargando". Propuesta: `Semantics(liveRegion: true, label: l10n.loading, child: ...)` y `CircularProgressIndicator(semanticsLabel: ...)`. Requiere agregar `loading` al ARB compartido.
- `error_view.dart:92` y `empty_state.dart:49`: iconos decorativos de 48 sin `excludeSemantics`. Propuesta: `ExcludeSemantics` (no son accionables) y envolver el mensaje de error en `Semantics(liveRegion: true)`.
- `app_card.dart:36`: `InkWell` sin `Semantics(button: true)`. Propuesta: envolver cuando `onTap != null`.
- `app_button.dart:67-84`: no fija `minimumSize` de 48. Material 3 deja 40 de alto en escritorio. Propuesta: `minimumSize: Size(48, 48)` en el tema (ver U5).

**U5. Alto, M. `AppTheme` descarta `success` y `warning` y no define temas de componentes.**
`packages/ui/lib/src/theme/app_theme.dart:11-43` construye un `ColorScheme` con 11 roles; la paleta de `tokens` (`colors.dart`, clase `ColorPalette`) tiene `successBase/On` y `warningBase/On` que nunca llegan al tema. Por eso `billing` fija `Color(0xFF2E7D32)` y compañía (ver B1). El tema tampoco tiene `FilledButtonThemeData`, `InputDecorationTheme` ni `minimumSize`, así que cada pantalla decide.
Propuesta: `ThemeExtension<StatusColors>` (`success`, `onSuccess`, `warning`, `onWarning`, `info`) registrada en `AppTheme._build`, leída con `Theme.of(context).extension<StatusColors>()!`. Agregar `info` a `design-tokens.json` y `tokens`. Añadir los temas de botón y de campo con mínimos de 48. Probar contraste con `textContrastGuideline`.

**U6. Medio, M. `ui` conoce el dominio de errores.**
`error_view.dart:1-2` y `action_error.dart:1-2` importan `contracts` e `i18n` (`ApiErrorException`, `ProblemDetails`), contra "`ui` no conoce ningún dominio". Propuesta: `ErrorView` recibe un `ErrorDetails(message, code, traceId)` neutro; la fábrica `fromException` y `actionErrorMessage` pasan a `i18n` o a un paquete pequeño de errores. Hacerlo después de U3.

**U7. Bajo, S. Valores de diseño sueltos.**
`error_view.dart:92`, `empty_state.dart:49` (`size: 48`), `app_button.dart:56` (`dimension: 16`). Propuesta: `AppIconSize.xl` y `AppIconSize.sm` en `tokens`.

---

## packages/tokens

**T1. Medio, S. Faltan roles y escalas que hoy se improvisan.**
`colors.dart` no tiene `info`; no hay `AppIconSize` ni `AppRadius.full`. Resultado: `BorderRadius.circular(999)` en `billing/.../status_chip.dart:20` y `usage_meter.dart:53`, y `BorderRadius.circular(12)` en `backoffice/.../sagas_screen.dart:106,108`, aunque existe `AppRadius`.
Propuesta: añadir `AppRadius.full`, `AppIconSize` y el rol `info`, regenerando desde `design-tokens.json`.

---

## packages/utils e i18n

**I1. Medio, S. `formatMoney` crea dos `NumberFormat` por llamada.**
`packages/utils/lib/src/money.dart:8-16`. En una lista de facturas se ejecuta por fila. Propuesta: calcular los decimales con una tabla ISO 4217 pequeña y cachear el formato por (locale, moneda) en una clase `MoneyFormatter` con constructor inyectable. Seguir la preferencia de implementar en casa.

**I2. Medio, S. No hay un `Clock` compartido.**
`typedef Clock = DateTime Function()` vive en `packages/auth/lib/src/session_manager.dart:13`, mientras `shell_core` (`shell_access.dart:64`, `shell_runtime.dart:53`) y `shell_host` (`shell_host.dart:44`, `step_up_page.dart:26`) repiten `DateTime Function()` y `clock = DateTime.now`.
Propuesta: mover `Clock` a `utils` (hoja del grafo, ya depende de `contracts`) junto con `FakeClock` en `test_utils`, y que `auth`, `shell_core` y `shell_host` lo importen.

**I3. Medio, M. Concatenación de frases fuera del ARB.**
Más de 35 sitios arman `'${l10n.etiqueta}: ${valor}'` o `'a · b · c'`: `backoffice/.../saga_detail_screen.dart:114-123,197,205`, `widgets.dart:179-186`, `dlq_screen.dart:195,224-230`, `tenants_screen.dart:122,150,186`, `sagas_screen.dart:51,123,133`, `account/.../sessions_screen.dart:119`, `devices_screen.dart:101`, `agreements_screen.dart:60,148-158`, `billing/.../billing_plan_screen.dart:142`, `invoice_detail_screen.dart:114`. La skill `front-i18n` lo prohíbe porque rompe en otros idiomas.
Propuesta: claves ARB con placeholders (`"sagaType": "Tipo: {value}"`) o un widget `LabeledValue(label, value)` en `ui` para los pares etiqueta y valor (y que sea `MergeSemantics`, que es el uso permitido). Los separadores `·` pasan a un `Text.rich` o a claves con placeholders.

**I4. Bajo, S. `supportedLocales` duplicado.**
`packages/i18n/lib/i18n.dart:14` ya expone la lista, pero `billing/test/utils/test_app.dart:35` escribe `const [Locale('es'), Locale('en')]`. Usar la del paquete.

---

## packages/shell_core

**SC1. Alto, M. `DateTime.now()` en `AccessRule` y reloj opcional.**
`packages/shell_core/lib/src/access_rule.dart:63,68,84`: `now ?? DateTime.now()` en `allows`, `decide` y `reachableBy`. Es el incumplimiento que marca el script.
Propuesta: hacer `now` obligatorio (`required Clock`/`DateTime now`) y que los llamadores (`ShellAccessScope`, `context.can`, `buildShellRouter`) pasen `clock()`. Con `Clock` de I2. Esfuerzo M por los llamadores y las pruebas (`access_rule_test.dart`, `mfa_rule_test.dart`).

**SC2. Alto, M. Estado global mutable y funciones con dependencias en lugar de clases.**

- `deferred_page.dart:12-32`: mapa global `_libraryLoads` y `resetDeferredPageCache()` marcada `@visibleForTesting`. Es estado en variable de nivel superior, y obliga a un `loadNow` duplicado en `tasks/test/support.dart:12` y `assistant/test/support.dart`. Propuesta: `final class DeferredLibraryLoader` con su caché por instancia, que `ShellHost` crea y entrega por constructor. `deferredPage` pasa a ser un método. Las pruebas crean su instancia y no necesitan reset.
- `shell_navigation.dart:10,23`: `homeLocation` y `signOutAndGoToLogin` reciben registro, router y sesión como parámetros. Propuesta: `final class ShellNavigator(registry, router, session, paths)` con `home()` y `signOutAndGoToLogin()`.
- `shell_access.dart:40,191` (`redirectFor`, `accessRedirect`) y `shell_router.dart:50-198` (`buildShellRouter`, unas 150 líneas y 8 parámetros): `final class ShellRouterFactory` con los colaboradores en el constructor y métodos pequeños (`_validatePaths`, `_wrapRoutes`, `_redirect`).
- `shell_host/lib/src/screen_loader.dart:10`: `shellScreenLoader` se vuelve método de esa misma clase.

**SC3. Medio, S. Sin API para declarar pantallas diferidas sin repetir.**
`mf_tasks.dart:39-79` repite `loadLibrary: screens.loadLibrary, loading: _loading, builder: (scope, {params = const {}}) => ...` cinco veces; `mf_account.dart`, `mf_backoffice.dart` igual. Ver M1 para la propuesta.

**SC4. Bajo, S. `defaultLifecycleRetryDelay` y `Timer` en `shell_runtime.dart:17,244`.**
Correcto (el retardo se inyecta con `lifecycleRetryDelay`). Solo documentar el parámetro en el constructor.

---

## packages/shell_host

**SH1. Alto, L. `ShellHost` hace demasiado.**
`packages/shell_host/lib/src/shell_host.dart:37-268` es registro, sesión, runtime, router, step-up, insignias del menú, cierre de sesión, restauración de sesión y rutas propias en una clase de 230 líneas, con tres `late final`.
Propuesta: extraer `MenuBadges` (líneas 111-125 y 195-207: suscripciones y mapa de conteos), `SessionBinding` (209-224: sigue el acceso de la conexión y cierra sesión) y `ShellRoutes` (234-267). `ShellHost` queda como composición con constructor que recibe esas piezas, y el caso común se arma con una fábrica `ShellHost.assemble(...)`. Esfuerzo L por las pruebas de `shell_host_test.dart` y de las dos apps.

**SH2. Medio, M. `MfaFlow` usa `bool busy` más `errorCode` más campos anulables.**
`packages/auth/lib/src/flows/mfa_flows.dart:20-21` (`_busy`, `_errorCode`, `_pending`, `_challenge`) permite combinaciones imposibles (ocupado con error). Propuesta: `sealed class MfaState` (`MfaIdle`, `MfaBusy`, `MfaAwaitingMethod(pending)`, `MfaAwaitingCode(pending, challenge)`, `MfaFailed(code, previous)`), y los widgets hacen `switch` exhaustivo. Los comentarios de ese archivo están en español y los de `mfa_widgets.dart` en inglés; unificar en inglés.

**SH3. Medio, S. Accesibilidad e input en los formularios del shell.**
`pages/mfa_widgets.dart:97-110` (`MfaErrorText`) no es región viva: un error de código incorrecto no se anuncia. `sign_in_form.dart:68-84` y `mfa_widgets.dart:79-86`: los `TextField` no declaran `textInputAction` ni `keyboardType` para el código. Propuesta: `Semantics(liveRegion: true)` en el error, `textInputAction: next` y `done`, `keyboardType: TextInputType.number` en el código.

**SH4. Bajo, S. `catch (error, stack)` en `shell_host.dart:164`.**
Intencional (reporta con `FlutterError.reportError`), pero contradice la regla. Dejarlo con un comentario del porqué o atrapar `Exception` y dejar pasar los `Error`.

---

## packages/auth y packages/api

**A1. Medio, S. `catch (error)` sin filtrar en `session_manager.dart:292`.**
Dentro de `_doRefresh`, atrapa también `Error`. Propuesta: `on Exception`. Revisar que el `rethrow` siguiente se mantenga.

**A2. Bajo, S. `Clock` duplicado.** Ver I2.

**A3. Bajo, S. `identity_connection.dart:251` decodifica JSON con `is Map<String, dynamic>` y `decoded['code'] is String`.**
Es el uso permitido de pattern matching; migrar a `if (decoded case {'code': String code})` si se toca.

---

## packages/test_utils

**TU1. Alto, M. El paquete casi no aporta.**
`packages/test_utils/lib/test_utils.dart` exporta solo 3 fakes de auth y `DeferredLibrariesLoader`. Solo `auth`, `shell_host`, `verifier` y las dos apps lo declaran. Los otros 6 microfrontends tienen su propio harness: `account/test/utils/test_app.dart`, `billing/test/utils/test_app.dart`, `backoffice/test/utils/harness.dart`, `notifications/test/utils/test_app.dart`, `tasks/test/support.dart`, `assistant/test/support.dart`, `verifier/test/support.dart`. Tres viven en `test/support.dart`, fuera de la convención `test/utils/`.
Duplicado verificado:

- Un `testApp`/`pumpApp` con `MaterialApp` + delegados + `ShellAccessScope` en 7 archivos.
- Un `ProblemDetails(...)` de prueba en 9 archivos (`unavailableProblem` está idéntico en `tasks/test/support.dart:111` y `assistant/test/support.dart:105`).
- 63 literales `UserSession(` en pruebas, con `billingSession`, `testSession`, etc., repartidos.
- `loadNow` duplicado en `tasks` y `assistant`.
  Propuesta: añadir a `test_utils` las clases `TestApp` (arma `MaterialApp` o `.router` con idioma, delegados extra y sesión), `SessionBuilder` (`.withPermissions`, `.mfaVerifiedAt(clock)`), `ProblemFixtures` (`unavailable()`, `forbidden()`), `FakeClock` y `TestScope` (scope demo o vivo). Cada microfrontend conserva solo lo propio (sus delegados y sus semillas). `test_utils` hoy depende de `auth` y `shell_core`: confirmar que no cree un ciclo al usarlo desde `ui` (si lo crea, dejar el `pumpApp` de `ui/test/utils/pump.dart` y que `test_utils` no dependa de `ui`).

**TU2. Alto, M. Faltan los utilitarios de accesibilidad y layout que piden las skills.**
Ningún `meetsGuideline` en todo el front, ninguna prueba de escala 2x, ningún golden, y `setSurface` existe solo en `ui/test/utils/pump.dart:28` (usado además en `backoffice/test/utils/harness.dart` y `mobile_shell_test.dart`).
Propuesta: en `test_utils`, `expectAccessible(tester)` (corre `androidTapTargetGuideline`, `iOSTapTargetGuideline`, `labeledTapTargetGuideline`, `textContrastGuideline`), `pumpAtWidths(tester, widget, {320, 800, 1280})` y `pumpAtTextScale(tester, 2.0)`. Después añadir una prueba por pantalla de microfrontend.

**TU3. Bajo, S. `pubspec.yaml` de `test_utils`: `flutter: ">=1.17.0"`.** Alinear con el resto (`sdk: ^3.14.0`).

---

## microfrontends/account

**AC1. Alto, L. Cinco pantallas con la lógica dentro del `State`.**
`sessions_screen.dart:33-74`, `devices_screen.dart:33`, `security_screen.dart:34-96`, `account_overview_screen.dart:31`, `agreements_screen.dart:26-80`. Cada una repite `_load` / `_reload`, usa `widget.repository.*` directo, atrapa errores, orquesta step-up y recarga. Ninguna descarta respuestas viejas: un `_reload()` rápido tras "cerrar sesión" puede pisar con datos antiguos (`sessions_screen.dart:42-51`).
Propuesta: `SessionsController`, `DevicesController`, `SecurityController`, `AgreementsController`, `AccountOverviewController` (`final class ... extends ChangeNotifier`) con `AsyncLoader` (U2) y `ActionRunner` (U3). Las pantallas quedan como `ListenableBuilder` y botones que llaman a métodos. Para el `closed` mutable de `sessions_screen.dart:67-72` y `codes` de `security_screen.dart:75-81`, que hoy se capturan en closures, el controlador devuelve el valor (`Future<int> closeOthers()`).

**AC2. Alto, M. Funciones con `BuildContext` y dependencias.**
`widgets/account_widgets.dart:133` (`runAccountAction`), `widgets/step_up.dart:17,27` (`confirmStepUp`, `runSensitiveAction`) y `screen_builders.dart:29,39,49` son funciones de nivel superior con dependencias. Propuesta: `final class StepUpGate(requestStepUp, canRule)` con `Future<bool> ensure()`, inyectado al controlador; `runAccountAction` desaparece con U3.

**AC3. Medio, S. `DateTime.now()` en el fake.**
`data/fake_account_repository.dart:108,135,145,172,197,202,226`. Propuesta: `FakeAccountRepository({Clock clock = ...})`, y una `FakeClock` en pruebas (`test/utils`). Semillas relativas a ese reloj.

**AC4. Medio, S. Solo layout compacto.**
`sessions_screen.dart:81-87` pasa solo `compact:` a `PlatformScreen`: en web ancho, la lista se estira a todo el ancho. Propuesta: `Center` + `ConstrainedBox(maxWidth: 720)` en el cuerpo (como `backoffice/.../widgets.dart:64`) o un `AccountPage` compartido en `ui`. También `Alignment.centerRight` (línea 106) debe ser `AlignmentDirectional.centerEnd`.

**AC5. Medio, S. `AccountAsyncView` (`account_widgets.dart:102-129`) duplica a `AsyncBody` de backoffice (`widgets.dart:121-147`).**
Ambos envuelven `AsyncValueView` con un mensaje. Con U6 el mapeo de error queda en `ui` y ambos desaparecen.

**AC6. Bajo, S. Comentarios en español en `lib/`** (`step_up.dart:7-12`, `sessions_screen.dart:15,25`, `account_widgets.dart` y otros). La skill `front-analisis` pide `///` en inglés. Unificar al tocar cada archivo. Lo mismo en `notifications` (`inbox_screen.dart:25,53,102`, `fake_notifications_repository.dart`) y `auth/flows`.

**AC7. Bajo, S. `localeTag` duplicado** en `account_widgets.dart:9` y `billing/.../billing_labels.dart:9`. Subir a `utils` o a `ui` (`context.localeTag`).

---

## microfrontends/assistant

**AS1. Alto, S. Variable global con regla de acceso.**
`assistant_chat_screen.dart:152`: `final AccessRule toolAccess = AccessRule.permissions([...])` es estado de nivel superior fuera de `shared/constants`, contra "nada de instancias globales". Propuesta: moverla a `shared/constants/assistant_access.dart` como `abstract final class AssistantAccess { static final tools = ...; }`, como hacen `tasks_access.dart` y `account_access.dart`.

**AS2. Alto, M. `AssistantChatController` mezcla `loadState` con `_error` y `load()` no descarta respuestas viejas.**
`assistant_chat_controller.dart:22-23` (`AsyncValue` + `Object? _error`) y `:39-49` (`load()` sin `_requestId`: un "reintentar" doble puede pisar). `send` no impide que `load` termine después y sobrescriba `_messages` (línea 47: `result.valueOrNull ?? _messages`). Propuesta: `sealed class ChatState` (`ChatLoading`, `ChatReady(messages, answer)`, `ChatFailed(error)`) con `AnswerState` (`Idle`, `Streaming(id)`, `Failed(error)`), `_requestId` en `load()`. `isStreaming` (línea 30, `_subscription != null`) pasa a salir del estado. Sin API documentada: los getters públicos (29-36) no llevan `///`.

**AS3. Medio, S. Lógica en el widget.**
`assistant_chat_screen.dart:143-147` (`_errorMessage` decide el texto por código de cuota) y `:55-64` (`_onChanged` decide cuándo mostrar el error). Propuesta: el controlador expone `ChatFailureKind` (`quotaExceeded`, `generic`) y el widget solo mapea a texto; `_reportedError` y la lógica de "mostrar una vez" pasan al controlador (`Object? takeError()`).

**AS4. Medio, S. `_scrollToEnd` salta al final en cada notificación** (`:66-72`), incluso si el usuario subió a leer. Propuesta: solo auto-desplazar si el usuario ya estaba al final (`position.pixels >= maxScrollExtent - tolerancia`).

**AS5. Medio, S. Accesibilidad del chat.**
`:124-136`: el campo de texto usa `hintText` sin `labelText`; botones `FilledButton` correctos pero el mensaje que llega del asistente no es región viva. Propuesta: `labelText: l10n.inputHint`, `Semantics(liveRegion: true)` sobre la burbuja que se está generando (con cuidado de no anunciar cada fragmento: anunciar al terminar con `SemanticsService.sendAnnouncement`). Magia en espaciado: `AppSpacing.sm + 4`, `md - 2`, `sm + 2` (líneas 167-190, 280), `maxWidth: 640`. Propuesta: tokens `AppSpacing.bubble` o un `ChatBubble` en un archivo propio (hoy `_MessageBubble` ocupa unas 200 líneas en el mismo archivo de la pantalla; regla "un archivo, una clase").

**AS6. Medio, S. Pruebas con esperas reales.**
`test/assistant_scope_test.dart:44,48,61,67` usa `Future<void>.delayed(const Duration(milliseconds: 90))` y `300` con reloj real; es frágil en CI lento. Propuesta: `fake_async` ya viene con `flutter_test` (`fakeAsync`), o que el fake exponga un `Completer` por fragmento.

---

## microfrontends/backoffice

**B0. Alto, L. Cinco pantallas con `Future` en el `State` y acciones dentro del widget.**
`sagas_screen.dart:24-33`, `saga_detail_screen.dart:35-78`, `dlq_screen.dart:31-99`, `tenants_screen.dart`, `tenant_detail_screen.dart:29`, `overview_screen.dart:26`. Usan `late Future<T>` reemplazado dentro de `setState` más `FutureBuilder` (`AsyncBody`), un estilo distinto al `AsyncValue` del resto. `dlq_screen.dart:57-99` mezcla confirmación, llamada, recarga de dos listas y snackbar en el `State`; `saga_detail_screen.dart:48-78` igual con el motivo.
Propuesta: `SagasController`, `SagaDetailController`, `DlqController`, `TenantsController` con `AsyncLoader` (U2) y `ActionRunner` (U3). Quitar `AsyncBody` (`widgets.dart:121`) y usar `AsyncValueView`. Los diálogos siguen en el widget (son presentación), pero `onConfirm` llama a un método del controlador.

**B1. Medio, S. Carga secuencial.**
`saga_detail_screen.dart:38-42`: `await saga(...)` y luego `await sagaAudit(...)`; son independientes. Propuesta: `Future.wait` o un `record` de futuros en el controlador.

**B2. Medio, S. `BackofficePage` envuelve todo en `SingleChildScrollView`.**
`widgets.dart:60-86`. Las listas (sagas, DLQ, tenants) se construyen enteras y pierden carga perezosa; la skill dice `ListView.builder` para largo desconocido. Propuesta: `CustomScrollView` con `SliverList` o que cada pantalla use `ListView.builder` con el encabezado como primer elemento. La navegación de secciones (`_SectionNav`, 92-117) usa `TextButton` sin indicar la sección actual ni semántica de selección. Propuesta: `NavigationBar` o `SegmentedButton` con `selected`.

**B3. Medio, S. Magia y direccionalidad.** `sagas_screen.dart:44` (`Alignment.centerLeft`), `:106,108` (`BorderRadius.circular(12)`), `widgets.dart:65` (`maxWidth: 1100`). Usar `AlignmentDirectional.centerStart`, `AppRadius.md`, una constante en `shared/constants`.

**B4. Medio, S. Concatenación en la UI.** Ver I3 (la mayor concentración: 20 sitios).

**B5. Bajo, S. `showBackofficeDialog` (`widgets.dart:31-38`) existe porque los diálogos van al navigator raíz y pierden la localización.** Es una solución local a un problema que tienen todos los microfrontends. Mejor un `DeferredLocalizations` en `shell_core` (ver M1) y usar `useRootNavigator: false`.

---

## microfrontends/billing

**BI1. Alto, S. Colores fijos que ya existen en `tokens`.**
`screens/widgets/billing_colors.dart:7-19` define `Color(0xFFB26A00)`, `0xFF2E7D32`, `0xFF1565C0`, `0xFF616161`, `0xFFC62828` y las usa `status_chip.dart` y `usage_meter.dart:29-31`. Contradice la skill de layout ("nunca `Color(0xFF...)`") y no cambia con el modo oscuro, así que el contraste en oscuro no está verificado. Propuesta: usar `StatusColors` de U5 y borrar el archivo. Para el chip, usar `color: statusColors.successContainer` o calcular el fondo con `Color.alphaBlend` en el tema en vez de `color.withValues(alpha: 0.12)` (`status_chip.dart:18`). El estado se muestra con etiqueta además de color, bien.

**BI2. Alto, M. Cuatro pantallas y una hoja con lógica en `State`.**
`billing_plan_screen.dart:37`, `invoices_screen.dart:26`, `invoice_detail_screen.dart:34`, `change_plan_sheet.dart:32-70`. `change_plan_sheet.dart:35` combina `bool _saving` con `_selectedId` y `_plans` (estado de tres piezas); `_confirm` orquesta la llamada y el `pop`. Propuesta: `ChangePlanController` (`ChangePlanState`: `Choosing(selectedId)`, `Saving(selectedId)`, `Failed(selectedId, error)`), `BillingPlanController`, `InvoicesController`.

**BI3. Medio, S. `usageLevelFor` es función de nivel superior dentro de `shared/types`** (`billing_types.dart:16`). Es pura y sin dependencias, está permitido, pero pertenece a `Quota`/`QuotaUsage` como método (`usage.level` ya existe en `usage_meter.dart:23`). Mover a la clase `QuotaUsage`.

**BI4. Medio, S. Duplicado `localeTag` (ver AC7)** y un `SizedBox(height: 160, child: LoadingView())` (`change_plan_sheet.dart:89`) que fija alto sobre contenido; usar `ConstrainedBox(minHeight:)`. `EdgeInsets.fromLTRB` en línea 79: `EdgeInsetsDirectional.only`.

---

## microfrontends/notifications

**N1. Alto, M. `_NotificationsInboxScreenState` es un controlador disfrazado y tiene carreras.**
`inbox_screen.dart:23-121`: búfer de llegadas en vivo, fusión (`_merge`), actualización optimista y reversión, todo en el `State`.

- `_fetch` (42-51) no descarta respuestas viejas: tocar "reintentar" dos veces mezcla dos `_merge`.
- `_markOptimistically` (104-121) revierte a `previous`, que descarta cualquier notificación que llegó en vivo mientras se guardaba (si llegó una nueva y falló el guardado, se pierde de la lista). Propuesta: revertir solo el campo `read` de los ids afectados.
  Propuesta: `InboxController` (`ChangeNotifier`) con `_requestId`, búfer, `markRead(id)`, `markAllRead()` y `InboxState` sealed. La pantalla solo pinta.

**N2. Medio, S. `PreferencesScreen` guarda sin serializar.**
`preferences_screen.dart:36-49`: dos toques seguidos lanzan dos `savePreferences`; si el primero falla y revierte a `previous`, borra el segundo cambio. Propuesta: `PreferencesController` con una cola (un guardado a la vez, `_pending` más reciente gana). La selección de hora usa `showTimePicker` en el widget, correcto; la decisión de `start` vs `end` (línea 70-82) va al controlador (`setQuietStart`, `setQuietEnd`).

**N3. Medio, S. `fake_notifications_repository.dart` es el patrón más completo de fake y no se reutiliza.**
Tiene `latency`, `fetchError`, `markError`, `saveError`, `isDisposed`, `_delayed` y `_notifyChanged` (líneas 11-75), reimplementados con otras formas en `FakeTasksRepository.failNext` (`fake_tasks_repository.dart:50`), `FakeAccountRepository._respond` (`:64`) y `FakeAssistantRepository`. Ver M2.

---

## microfrontends/tasks

**TK1. Alto, M. Formulario y detalle con la lógica en el widget; la lista, bien.**
`TasksListController` (`tasks_list_controller.dart:15-135`) es el modelo a seguir. En cambio:

- `task_form_screen.dart:34-124`: `_saving`, `_fieldErrors`, `_loaded`, `_save`, `_load`, `_retry`, decisión de crear o editar y de a dónde navegar. Propuesta: `TaskFormController` con `TaskFormState` sealed (`Loading`, `Editing(fieldErrors)`, `Saving`, `Saved(taskId)`, `LoadFailed`). La pantalla solo navega cuando ve `Saved`.
- `task_detail_view.dart:37-125`: `_requestId`, `_deleting`, suscripción a cambios, `_confirmDelete`. Propuesta: `TaskDetailController` con la suscripción y el descarte, igual que la lista. `_deleting` (bool que silencia un evento) es una señal de que el estado debe ser sealed (`Showing`, `Deleting`, `Deleted`).

**TK2. Medio, S. `DateTime.now()` y generación de UUID dentro del fake.**
`fake_tasks_repository.dart:148`. Propuesta: inyectar `Clock` y mover el generador a `class UuidV7Generator` con su propio archivo (hoy son 25 líneas de aritmética dentro del repositorio) y pruebas propias. Pasar `delay` a `FakeBehavior` (M2).

**TK3. Medio, S. Layout con valores fijos.**
`tasks_list_screen.dart:86` (`SizedBox(width: 360`), `:114,137` (`EdgeInsets.fromLTRB`). Usar `AppLayout.listPaneWidth` y `EdgeInsetsDirectional`. En esa pantalla, `_select` mantiene `_selectedId` en el `State`: es estado de pantalla, va al controlador.

**TK4. Medio, M. `mf_tasks.dart:39-79` y `builders.dart`.** Ver M1.

**TK5. Bajo, S. `test/support.dart` y `test/manifest_test.dart` + `test/tasks_screens_test.dart` (467 líneas).** `support.dart` debe ir a `test/utils/`; partir `tasks_screens_test.dart` por pantalla (`test/screens/tasks_list_screen_test.dart`, etc.) como pide la skill de pruebas (espejo de `lib/src`).

---

## microfrontends/verifier

**V1. Alto, M. `_VerifierViewState` es una máquina de estados escrita a mano.**
`verifier_screen.dart:61-215`: siete campos (`_pending`, `_code`, `_copied`, `_denying`, `_blocked`, `_secondsLeft`, `_generation`), un `Timer.periodic` (139), una suscripción, y cuatro sitios que hacen `_ticker?.cancel(); _generation++;` (100-161, 197-198). Los `bool` `_denying` y `_blocked` junto a `_pending` permiten combinaciones imposibles, y `_copied` nunca vuelve a `false` salvo con un reto nuevo.
Propuesta: `VerifierController` con `sealed VerifierState` (`Waiting`, `Challenge(challenge, code, secondsLeft, copied)`, `Denying`, `Blocked`, `Failed(error)`), `Timer` inyectable (un `Ticker` con `Duration` por constructor, como `searchDelay` en la lista) y `_generation` encapsulado. El tick de un segundo debería recalcularse con `Clock` y `expiresAt`, no con un contador `_secondsLeft--` que se desvía si la app pasa a segundo plano.

**V2. Medio, S. Accesibilidad de la cuenta atrás y del código.**
`verifier_widgets.dart` (193 líneas): la cuenta atrás cambia cada segundo sin `Semantics`; el código de 6 dígitos agrupado (`verifier_codes.dart:19`, `groupCode`) debería leerse dígito a dígito y no anunciarse cada segundo. Propuesta: `Semantics(label: ..., value: ..., liveRegion: false)` y anunciar solo al llegar a 10 s y a 0 con `SemanticsService.sendAnnouncement`. `disableAnimations` para la barra de progreso.

**V3. Bajo, S. `data/fake_verifier_repository.dart:19` y `demo_device_key.dart`** ya implementan el puerto con una clase. Bien. Solo `verifier/test/support.dart` debería moverse a `test/utils/`.

---

## apps/web y apps/mobile

**AP1. Alto, M. Los dos scaffolds duplican y difieren en el cálculo de "seleccionado".**
`apps/web/lib/src/pages/web_shell_scaffold.dart:27-62` y `apps/mobile/lib/src/shell/mobile_shell_scaffold.dart:33-98` arman el mismo `ListenableBuilder` con destinos, insignias y acción de salir. Además divergen: web compara por `manifestForPath(...)?.id` (línea 33-36) y móvil por `location.startsWith(e.path)` (línea 59), que da falso positivo con `/tasks2` y `/tasks`. La lógica de partir en principales y "Más" (líneas 38-52 de móvil) está dentro de `build`.
Propuesta: `final class ShellMenuModel(host, location, locale, maxPrimary)` en `shell_host` con `destinations`, `selectedIndex`, `overflow`, `onSelected` y pruebas unitarias; los scaffolds solo pintan. Quitar `host.signOut()` sin `await` en una lambda (`onPressed: () => host.signOut()`) usando `unawaited` explícito o dejar que el modelo lo envuelva. Esfuerzo M.

**AP2. Alto, M. 1370 líneas de pruebas casi iguales.**
`apps/web/test/web_shell_test.dart` (719) y `apps/mobile/test/mobile_shell_test.dart` (652) repiten los mismos escenarios (inicio de sesión con `from`, cierre de sesión, página prohibida, step-up, MFA, cambio de identidad) con nombres distintos. Propuesta: una suite compartida en `shell_host/test/` con una función `defineShellScenarios(ShellFixture)` y que cada app solo pruebe lo suyo (el menú de cada plataforma, el "Más" de móvil, `deep_link_mapper`). Esfuerzo M a L.

**AP3. Medio, S. `config.dart` y `main.dart` idénticos salvo el almacén de tokens.**
`webIdentityConnection` y `mobileIdentityConnection` repiten la estructura; la diferencia son 2 argumentos. Está bien tener dos apps, pero un `IdentityConnectionFactory` en `shell_host` con `fromBaseUrl(String, {required TokenStore, required HttpTransport})` quita la condición `baseUrl.isEmpty` repetida. Esfuerzo S.

**AP4. Bajo, S. `front/build/` existe vacío en la raíz.** La skill de estructura lo prohíbe en la raíz (la salida va al `build/` de cada app). Borrar y comprobar que el `.gitignore` lo cubre.

---

## tools

**TL1. Medio, M. Las comprobaciones no cubren las reglas de `front-codigo`.**
`check_microfrontend_boundaries.dart` y `check_deferred_chunks.dart` verifican fronteras y trozos diferidos, y el script `check-structure.mjs` (fuera de `front/`) solo revisa `DateTime.now()`. No hay comprobación automática de: `catch (e)` sin `on`, `bool isLoading` más `error` en controladores, `Color(0x...)` o `Colors.` en `lib/` de microfrontends, `setState` seguido de `await` sin `mounted`, literales `Text('...')`. Propuesta: agregar una regla de analizador propia no es barato (plugin); más práctico ampliar `check-structure.mjs` con tres reglas baratas (`Color(0x` fuera de `tokens`, `catch (` sin `on` en `lib`, `Text('` con literal en `screens`) y habilitar las lint de `front-analisis` (`unawaited_futures`, `avoid_dynamic_calls`, `public_member_api_docs` en paquetes compartidos).

**TL2. Bajo, S. Las herramientas son scripts con funciones de nivel superior** (`check_microfrontend_boundaries.dart:54-257`, `check_deferred_chunks.dart:35-242`). Para CLIs es aceptable, pero ambas repiten `_fatal` (255 y 240) y la búsqueda de la raíz del front (`_allMicrofrontends`, `_findFrontRoot`). Extraer `FrontRoot` y `CliExit` a un `tools/lib/` compartido. Prioridad baja.

**TL3. Bajo, S. `check_deferred_chunks.dart:133` define `_ArbText` y `_Options` como clases, pero el resto es procedural.** Solo mencionarlo: si se toca, convertirlo en `DeferredChunkChecker`.

---

## Transversales: facilidad de uso para crear un microfrontend nuevo

**M1. Alto, M. Hoy un microfrontend nuevo exige copiar y pegar ~6 bloques.**
Para crear uno (por ejemplo `reports`) hay que escribir a mano:

1. `mf_reports.dart` con `ScreenRoute(... loadLibrary: screens.loadLibrary, loading: _loading, builder: (scope, {params = const {}}) => ...)` por pantalla (`mf_tasks.dart:39-79`: 40 líneas para 4 rutas).
2. `_localized(...)` con `Localizations.override`: copiado en `account/screen_builders.dart:39`, `billing_screens.dart:45`, `tasks/builders.dart:22`, `backoffice/widgets.dart:16`, `assistant_screens.dart:47`, `notifications/screens.dart:40`, `verifier_screen.dart:44`.
3. `_repository(scope)` con `scope.get<T>((services) => switch (services.mode) {...})` (account, billing, notifications, tasks).
4. Una clase de rutas, de acceso, de constantes y de enums, cada una en su archivo.
5. Harness de pruebas (ver TU1).
6. Un fake con latencia, fallos y `dispose` (ver M2).
   Propuesta, en `shell_core`:

- `ScreenRoute.deferred(path, library: screens.loadLibrary, build: (scope, params) => ...)` con `loading` por defecto del shell; deja las 5 líneas por ruta en 1.
- `DeferredLocalizations(delegates: [...], child: ...)` que reemplaza los siete `_localized`.
- `RepositoryBinding<T>(demo: (services) => ..., live: (services) => ...)` con `scope.repository(binding)`; elimina el `switch` repetido y el cast de `scope.get`.
- Una plantilla (`nx generate` o una skill `front-nuevo-microfrontend`) que cree el esqueleto con las carpetas `data/`, `screens/`, `shared/` y su `test/utils/`.
  El resultado debería ser: un `mf_x.dart` de unas 25 líneas y un `screens.dart` con una función por ruta.

**M2. Alto, M. Fakes sin una pieza común de latencia, fallos y cierre.**
Seis fakes reimplementan `delay`/`latency`, fallo programable y `_disposed`: `fake_tasks_repository.dart:31-132`, `fake_notifications_repository.dart:7-75`, `fake_account_repository.dart:20-65`, `fake_backoffice_repository.dart:8-33`, `fake_assistant_repository.dart:17-103`, `fake_billing_repository.dart:12`. Cada uno con nombres y semánticas distintas (`failNext`, `fetchError`, `markError`, `isDisposed`).
Propuesta: `final class DemoBehavior({Duration delay, Clock clock})` en `shell_core` con `Future<T> respond<T>(T Function() compute)`, `failNext(Object error, {int count})`, `dispose()` y `isDisposed`. Cada fake recibe un `DemoBehavior` por constructor (composición) en lugar de heredar. Quita `DateTime.now()` de los fakes de una vez (SC1/AC3/TK2).

**M3. Medio, S. Dependencias con `^` en pubspecs.** `go_router: ^18.1.4`, `intl: ^0.20.3`, `material_ui: ^1.11.0` en los 7 microfrontends y `shell_core`; la skill `front-estructura` pide versiones exactas. Fijarlas con una sola fuente en `front/pubspec.yaml` (workspace) y que los microfrontends no las repitan si el workspace lo permite.

---

## Plan por paquetes de trabajo

Los conjuntos de archivos son disjuntos. Los paquetes 1 a 3 son la base y deben aterrizar primero, en este orden. Los paquetes 4 a 11 son independientes entre sí y pueden ir en paralelo cuando la base esté lista. Los conflictos de pruebas se evitan porque cada paquete es dueño del `test/` de su microfrontend.

**WP1. Base de UI y estado.** (U1 a U7, T1, I3 parcial, I4, TU2 parcial)
Archivos: `packages/ui/**`, `packages/tokens/**` (más `design-tokens.json`), `packages/i18n/**`.
Entrega: `AsyncValue` separado con `guard` seguro, `AsyncLoader<T>`, `ActionRunner`, `StatusColors`, temas de botón y campo, accesibilidad de los componentes, `LabeledValue`, claves ARB nuevas (`loading`, etiquetas con placeholder).
Esfuerzo: L. Primero, porque todo lo demás lo usa.

**WP2. Base de shell.** (SC1 a SC4, SH1, SH3, SH4, I2, M1 parte shell, M2, AP1 modelo)
Archivos: `packages/shell_core/**`, `packages/shell_host/**`, `packages/utils/**` (el `Clock`).
Entrega: `Clock` compartido, `AccessRule` con `now` obligatorio, `DeferredLibraryLoader`, `ShellNavigator`, `ShellRouterFactory`, `ScreenRoute.deferred`, `DeferredLocalizations`, `RepositoryBinding`, `DemoBehavior`, `ShellMenuModel`, división de `ShellHost`.
Esfuerzo: L. En paralelo con WP1 salvo por `Clock` (WP2 lo crea; WP1 no lo usa).

**WP3. test_utils.** (TU1 a TU3, I4 en pruebas)
Archivos: `packages/test_utils/**` y `packages/ui/test/utils/**`.
Entrega: `TestApp`, `SessionBuilder`, `ProblemFixtures`, `FakeClock`, `TestScope`, `expectAccessible`, `pumpAtWidths`, `pumpAtTextScale`, `DeferredLibraryLoader` de pruebas.
Esfuerzo: M. Depende de WP1 y WP2 solo en nombres de clase; se puede escribir contra las firmas acordadas.

**WP4. auth y api.** (A1 a A3, SH2)
Archivos: `packages/auth/**`, `packages/api/**`.
Entrega: `catch` filtrado, `MfaState` sealed (la parte de `shell_host` que lo consume, `pages/mfa_widgets.dart`, `sign_in_form.dart`, `step_up_form.dart`, la hace WP2 al integrarlo). Para no solapar, WP4 expone el estado y WP2 adapta los widgets en la misma entrega.
Esfuerzo: M.

**WP5. account.** (AC1 a AC7, I3 en sus archivos)
Archivos: `microfrontends/account/**`.
Esfuerzo: L. Cinco controladores, `StepUpGate`, fake con reloj, pruebas por pantalla.

**WP6. backoffice.** (B0 a B5, I3 en sus archivos)
Archivos: `microfrontends/backoffice/**`.
Esfuerzo: L. Es el que más texto concatenado tiene.

**WP7. billing y notifications.** (BI1 a BI4, N1 a N3)
Archivos: `microfrontends/billing/**`, `microfrontends/notifications/**`.
Esfuerzo: M a L. BI1 es rápido (S) y de alto valor; hacerlo primero.

**WP8. tasks y verifier.** (TK1 a TK5, V1 a V3)
Archivos: `microfrontends/tasks/**`, `microfrontends/verifier/**`.
Esfuerzo: M.

**WP9. assistant.** (AS1 a AS6)
Archivos: `microfrontends/assistant/**`.
Esfuerzo: M.

**WP10. apps.** (AP1 a AP4)
Archivos: `apps/web/**`, `apps/mobile/**`, `front/build/`.
Esfuerzo: M a L. Depende de `ShellMenuModel` (WP2). La suite compartida de escenarios (AP2) necesita un archivo nuevo en `packages/shell_host/test/`, que pertenece a WP2; coordinar para que WP2 la cree y WP10 la consuma.

**WP11. tools, pubspecs y CI.** (TL1 a TL3, M3)
Archivos: `tools/**`, `pubspec.yaml` de la raíz, `.claude/skills/front-estructura/scripts/check-structure.mjs`.
Esfuerzo: M. Al final: las reglas nuevas del script marcarían código que WP5 a WP9 todavía no migró.

Orden recomendado: WP1, WP2 y WP3 en paralelo (con las firmas pactadas) y después WP4; luego WP5 a WP10 en paralelo; WP11 al cerrar. Dentro de cada microfrontend, empezar por el hallazgo S de mayor valor (BI1, AS1, AC3, TK2) como primer commit independiente.
