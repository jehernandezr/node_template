# Plan de solución de la revisión del front

Fecha: 2026-11-14. Estado: propuesta, pendiente de visto bueno del usuario en las decisiones de la sección 8.

Resuelve los hallazgos de [la revisión del front](../audits/2026-11-14-revision-front.md). Contrato de microfrontend: [ADR 0012](../adr/0012-front-flutter-shells-microfrontends.md) y [ADR 0018](../adr/0018-contrato-de-microfrontend.md). Reglas: skills `front-*` y `CLAUDE.md`.

Las rutas son relativas a `front/` salvo que diga otra cosa. Esfuerzo: S (menos de medio día), M (1 a 2 días), L (más de 2 días).

## 1. Verificación de los hallazgos

Releí el informe y comprobé cada hallazgo contra el código. El script `check-structure.mjs --all` confirma los 3 incumplimientos de `DateTime.now()`. Conté 24 clases `State` en microfrontends (28 con paquetes), 51 llamadas a `widget.repository.`, 0 `Semantics(` en `lib/`, 4 `tooltip`, 0 pruebas con guías de accesibilidad o goldens, 3 controladores (`TasksListController`, `AssistantChatController` y `MfaFlow`) y 11 `catch` sin `on` fuera de `contracts`.

### 1.1 Se sostienen

U1, U2, U3, U5, U7, T1, I1, I2, I3, I4, SC1, SC2, SC3, SH1, SH2, A1, TU1, TU2, TU3, AC1 a AC7, AS1 a AS6, B0 a B5, BI1, BI2, BI4, N1 a N3, TK1 a TK5, V1, V2, V3, AP1 a AP3, M1, M2. Resumen de lo comprobado:

- AP1: el móvil elige el destino con `location.startsWith(e.path)` (`mobile_shell_scaffold.dart:58`), y `/tasks2` marcaría `/tasks`. La web compara por id de manifiesto.
- AP2: 719 y 652 líneas de pruebas casi iguales.
- N1 y N2: `_markOptimistically` y `_update` revierten a una copia anterior, así que pisan cambios posteriores.
- AS2: `load()` no lleva `_requestId` y hace `result.valueOrNull ?? _messages`.
- V1: `_secondsLeft--` en un `Timer.periodic`, sin reloj.
- I3: 21 interpolaciones directas de `${l10n.x}` en microfrontends, más los separadores `·` (18 con ese patrón). El informe dice 35 o más y el orden de magnitud es correcto. Además hay una en `ui`: `error_view.dart` arma `'${l10n.errorCodeLabel}: $errorCode'`.
- M1 y M2: `_localized` existe en 7 archivos y hay 6 fakes con latencia y fallos propios.

### 1.2 Se sostienen con corrección

- **Ids cruzados.** U5 y el resumen dicen "ver B1" para los colores de billing, y el hallazgo es BI1. B1 es la carga secuencial de `saga_detail_screen.dart`.
- **U3, `try/catch` en pantallas.** Son 12 bloques `try {` en `screens/`, no 24. La conclusión no cambia.
- **U4, accesibilidad base.** El spinner sin etiqueta y el `InkWell` de `app_card.dart` se sostienen. Tres puntos no:
  - La clave `loading` ya existe en los dos ARB compartidos (`app_es.arb:36`). No hay que agregarla. `LoadingView` no la usa.
  - Los iconos de `error_view` y `empty_state` no necesitan `ExcludeSemantics`: un `Icon` sin `semanticLabel` ya no entra al árbol semántico.
  - El mínimo de 48 en `AppButton` es decisión de producto: la skill acepta 24 como piso en web con puntero. Va a la sección 8.
- **SH2, ubicación.** `MfaFlow` vive en `packages/auth`, no en `shell_host`. Lo consumen tres formularios de `shell_host`. Se divide así: `auth` produce el estado y `shell_host` adapta los widgets.
- **SH3.** El campo de correo ya declara `keyboardType`. Faltan `textInputAction`, `keyboardType` del código y la región viva del error.
- **SH4 y `catch (error, stack)` en `microfrontend_scope.dart:97` y `shell_runtime.dart:229,267`.** El informe solo nombra `shell_host.dart:164`. Los cuatro reportan con `FlutterError.reportError` y siguen: es intencional. Se documentan con un comentario `// catch-all:` y la regla nueva del script lo respeta (decisión 3.17).
- **M3, versiones exactas.** Se sostiene: 11 `go_router: ^`, 9 `intl: ^` y 12 `material_ui: ^`. Pero pub no tiene un catálogo único de versiones en el workspace, así que "una sola fuente" no es posible. Se fija el número exacto en cada `pubspec.yaml` y el script lo vigila.
- **TU1, riesgo de ciclo.** El informe teme que `test_utils` cree un ciclo con `ui`. Ya existe uno de desarrollo: `auth` tiene `test_utils` en `dev_dependencies` y `test_utils` depende de `auth`, y funciona. `ui` no usa `test_utils` (tiene su propio `test/utils/pump.dart`), así que `test_utils` puede depender de `ui` sin ciclo nuevo.
- **AP2, ubicación de la suite.** Un paquete no puede importar el `test/` de otro. La suite compartida va en `packages/test_utils/lib/src/shell/scenarios/`, no en `shell_host/test/` como propone el informe.
- **B5, diálogos.** La propuesta del informe (`useRootNavigator: false`) no resuelve el problema. Un diálogo es una ruta del `Navigator`, hermana de la página, y no hereda el `Localizations.override` de la página en ningún caso. Se resuelve con `DeferredLocalizations` más un helper que reaplica los delegados (decisión 3.8).
- **U6.** Se sostiene, y se simplifica: `ui` solo importa `contracts` en `error_view.dart` y `action_error.dart`. El mapeo de errores pasa a `i18n` (que ya tiene `errorMessage(l10n, code)`) y `ui` deja de depender de `contracts`.
- **U1, riesgo.** Cambiar `guard` a `on Exception` hace que un `StateError` lanzado por un fake escape en vez de mostrarse como error. Hay pruebas que lo usan como falla (`account/test/screens/overview_screen_test.dart:49`, `screen_builders_test.dart:136`). Se cambian a una excepción tipada.

### 1.3 Se descartan o se dejan fuera

- **BI3** (`usageLevelFor` dentro de `shared/types`): es una función pura sin dependencias y la regla la permite. No se toca.
- **SC4** (`defaultLifecycleRetryDelay` y `Timer` en `shell_runtime.dart`): el informe mismo lo marca como correcto. Solo se documenta el parámetro, dentro de P1.2.
- **A3** (`is Map<String, dynamic>` en `identity_connection.dart`): es el uso permitido de pattern matching. Se deja, salvo que se toque.
- **TL2 y TL3** (`FrontRoot`, `CliExit`, `DeferredChunkChecker`): el informe los marca como prioridad baja y los scripts de CLI son aceptables como están. Fuera de alcance.
- **AP4** (`front/build/`): existe y contiene solo `.last_build_id`; está cubierto por `front/**/build/` del `.gitignore`. Es basura local, no incumplimiento versionado. Se borra dentro de P0.2 por limpieza, sin más.
- **Endurecer `analysis_options.yaml`** (propuesta de TL1: `unawaited_futures`, `public_member_api_docs`, etc.): la skill `front-analisis` pide hacerlo como un cambio propio con todo en verde. Fuera de este plan (sección 6).

## 2. Cómo se ejecuta

### 2.1 Reglas de la tropa

- Cada tropa trabaja en su copia del repositorio con una lista de archivos exclusiva. Dos tropas de la misma oleada nunca tocan el mismo archivo.
- Los archivos barril (`lib/<paquete>.dart`) y los `pubspec.yaml` los edita solo el guía. Los Haiku le piden por escrito la línea de export que necesitan.
- El guía escribe primero el esqueleto de interfaces de su paquete: archivos con las firmas de este plan y cuerpos `throw UnimplementedError()`. Con eso los dos Haiku trabajan en paralelo sobre archivos distintos. El guía revisa el diff completo y corre los comandos de aceptación antes de entregar.
- Los Haiku siguen instrucciones literales. Cada instrucción nombra archivo, clase, firma y prueba. Nada de "refactoriza lo que haga falta".
- Los textos de usuario, los comentarios `///` y los comentarios nuevos van como piden `front-i18n` y `front-analisis`: ARB en español e inglés, `///` en inglés.

### 2.2 Primero lo aditivo, el retiro al final

Las API nuevas se agregan sin romper las viejas. Los consumidores migran en las oleadas 2 y 3, y la oleada 4 borra lo viejo. Así el repositorio compila y pasa pruebas al cierre de cada oleada. Para no llenar el análisis de avisos `deprecated_member_use` (que `analyze` cuenta como `info`), lo legado no lleva `@Deprecated`: lleva un comentario `/// Legacy: removed in wave 4.` y la lista de la sección 4.5.

Excepción pactada: `AccessRule` pasa a `now` obligatorio en la oleada 1, y los 5 `manifest_test.dart` de microfrontends que lo llaman reciben el cambio de una línea en la misma oleada (P1.2). No pueden esperar.

### 2.3 Comandos de aceptación

Cada paquete de trabajo corre, con sus proyectos de Nx (`front-<nombre del pubspec>`; los microfrontends son `front-mf_<id>` y las apps `front-web_shell` y `front-mobile_shell`):

```bash
pnpm nx run-many -t format-check analyze test --projects=<proyectos>
node .claude/skills/front-estructura/scripts/check-structure.mjs --changed .
```

Además:

- Un paquete que toca un manifiesto, pantallas diferidas o `shell_core` corre `check_deferred_chunks` al final, tras compilar la web:

  ```bash
  cd front/apps/web && flutter build web --release --source-maps \
    && dart run ../../tools/check_deferred_chunks.dart
  ```

- Un paquete que cambia una API compartida corre además `analyze` y `test` de sus consumidores, para probar que lo aditivo no rompió nada: `pnpm nx run-many -t analyze test --projects=<consumidores>`.
- Un microfrontend corre también `dart run tools/check_microfrontend_boundaries.dart` (ya va dentro de su `analyze`).
- Tras editar un ARB: `flutter gen-l10n` en la carpeta del paquete, y el resultado de `l10n/generated` se versiona.
- Tras editar un `pubspec.yaml`: `flutter pub get` en `front/`.

## 3. Decisiones de diseño

Todas las firmas son Dart 3. Se escriben con constructores clásicos; los constructores primarios son opcionales (`front-codigo`).

### 3.1 `Clock`

Hoy `Clock` vive en `auth` y otras cinco declaraciones repiten `DateTime Function()`. Pasa a `utils` (hoja del grafo: depende de `contracts` e `intl`) y `auth`, `shell_core`, `shell_host` y `test_utils` lo importan. `utils` es el único lugar donde se llama `DateTime.now()`, y el script lo permite solo en `utils/lib/src/clock.dart`.

```dart
// packages/utils/lib/src/clock.dart
/// Source of the current time. Inject it; never call `DateTime.now()`.
typedef Clock = DateTime Function();

/// The wall clock. The default of composition roots (`ShellHost`, `ShellRuntime`).
DateTime systemClock() => DateTime.now();
```

```dart
// packages/test_utils/lib/src/clock/fake_clock.dart
/// Clock that only moves when the test says so.
final class FakeClock {
  /// Starts at [start], or at 2026-01-01 UTC.
  FakeClock([DateTime? start]);

  /// Current fake time. Pass it as a [Clock]: `clock: fake.now`.
  DateTime now();

  /// Moves the time forward by [by].
  void advance(Duration by);

  /// Jumps to [at].
  void set(DateTime at);
}
```

`AccessRule` deja de llamar a `DateTime.now()`. El valor por defecto desaparece y los llamadores pasan `clock()`:

```dart
bool allows(UserSession session, {required DateTime now});
AccessDecision decide(UserSession session, {required DateTime now});
bool reachableBy(UserSession session, {required DateTime now});
```

`ShellAccessScope`, `ShellRuntime`, `ShellHost` y `StepUpPage` usan `Clock clock = systemClock`. Lo demás no cambia.

### 3.2 `AsyncValue`, `AsyncLoader`, `ActionRunner`

`AsyncValue` sale del archivo del widget a `packages/ui/lib/src/state/async_value.dart`, y `guard` atrapa solo `Exception`.

```dart
sealed class AsyncValue<T> {
  const AsyncValue();
  const factory AsyncValue.loading() = AsyncLoading<T>;
  const factory AsyncValue.data(T value) = AsyncData<T>;
  const factory AsyncValue.error(Object error, [StackTrace? stackTrace]) =
      AsyncError<T>;

  /// Runs [load]; an [Exception] becomes [AsyncError], an [Error] escapes.
  static Future<AsyncValue<T>> guard<T>(Future<T> Function() load);

  bool get isLoading;
  T? get valueOrNull;

  /// Exhaustive fold, so a screen cannot forget a case.
  R when<R>({
    required R Function() loading,
    required R Function(T value) data,
    required R Function(Object error) error,
  });
}
```

`AsyncLoader<T>` es el controlador genérico de carga. Descarta respuestas viejas y no notifica tras `dispose`.

```dart
// packages/ui/lib/src/state/async_loader.dart
final class AsyncLoader<T> extends ChangeNotifier {
  AsyncLoader(Future<T> Function() fetch);

  /// Current state. Starts as [AsyncLoading].
  AsyncValue<T> get value;

  /// Fetches again. The answer of an older call is dropped. With
  /// [keepCurrent] and data on screen, the data stays until the new one
  /// arrives instead of going back to loading.
  Future<void> load({bool keepCurrent = false});

  /// Replaces the data (optimistic edits) and drops any fetch in flight.
  void setData(T data);

  @override
  void dispose();
}
```

`ActionRunner` ejecuta las acciones del usuario sin `BuildContext` y devuelve un resultado cerrado:

```dart
// packages/ui/lib/src/state/action_runner.dart
sealed class ActionResult<T> {
  const ActionResult();
}

/// The action finished and returned [value].
final class ActionSucceeded<T> extends ActionResult<T> {
  const ActionSucceeded(this.value);
  final T value;
}

/// The action threw an [Exception].
final class ActionFailed<T> extends ActionResult<T> {
  const ActionFailed(this.error, [this.stackTrace]);
  final Object error;
  final StackTrace? stackTrace;
}

/// The action did not run: the runner was busy or a precondition (a step-up)
/// was declined.
final class ActionSkipped<T> extends ActionResult<T> {
  const ActionSkipped();
}

/// What to do with a call made while another one is running.
enum ActionConcurrency { parallel, serial, dropWhileRunning }

final class ActionRunner extends ChangeNotifier {
  ActionRunner({this.concurrency = ActionConcurrency.dropWhileRunning});

  final ActionConcurrency concurrency;

  /// Whether at least one action is running.
  bool get isRunning;

  /// Runs [action]. An [Exception] becomes [ActionFailed]; an [Error] escapes.
  Future<ActionResult<T>> run<T>(Future<T> Function() action);

  @override
  void dispose();
}
```

Dos piezas más de `ui` cierran el patrón en el widget:

```dart
/// Owns a controller for the life of the widget: creates it once, listens to
/// it, rebuilds on change and disposes it. A screen built with it can be a
/// StatelessWidget.
class ControllerBuilder<C extends ChangeNotifier> extends StatefulWidget {
  const ControllerBuilder({
    super.key,
    required this.create,
    required this.builder,
  });

  /// Called once, in `initState`. May read inherited widgets with `read`
  /// style lookups only (for example `ShellAccessScope.maybeRead`).
  final C Function(BuildContext context) create;
  final Widget Function(BuildContext context, C controller) builder;
}

/// Shows the outcome of an action: the [success] text on [ActionSucceeded],
/// [showActionError] on [ActionFailed], nothing on [ActionSkipped]. Returns
/// whether it showed something. Does nothing if [context] is unmounted.
bool showActionResult(
  BuildContext context,
  ActionResult<Object?> result, {
  String? success,
  String? failure,
});
```

`showActionError` queda como está. `ErrorView`, `AsyncValueView` y `showActionError` dejan de importar `contracts` (decisión 3.5).

### 3.3 El controlador por pantalla

Regla: cada pantalla con estado o lógica tiene un `final class XController extends ChangeNotifier` en `screens/x_controller.dart`. Recibe por constructor el puerto del repositorio y, si hace falta, un `StepUpGate`, un `Clock` o un `Duration`. Compone un `AsyncLoader` y un `ActionRunner`, expone estado inmutable y devuelve el resultado de cada acción. La pantalla es un `StatelessWidget` con `ControllerBuilder`. Se prueba sin widgets.

Ejemplo de `account`:

```dart
final class SessionsController extends ChangeNotifier {
  SessionsController(AccountRepository repository, {required StepUpGate stepUp})
    : _repository = repository,
      _stepUp = stepUp,
      _loader = AsyncLoader(repository.listSessions),
      _runner = ActionRunner() {
    _loader.addListener(notifyListeners);
    _runner.addListener(notifyListeners);
  }

  final AccountRepository _repository;
  final StepUpGate _stepUp;
  final AsyncLoader<List<SessionSummary>> _loader;
  final ActionRunner _runner;

  /// Active sessions, loading or failed.
  AsyncValue<List<SessionSummary>> get sessions => _loader.value;

  /// Whether a close action is running.
  bool get isBusy => _runner.isRunning;

  /// Loads the sessions.
  Future<void> start() => _loader.load();

  /// Closes one session and reloads the list.
  Future<ActionResult<void>> closeSession(String id) async {
    final result = await _runner.run(() => _repository.revokeSession(id));
    if (result is ActionSucceeded<void>) unawaited(_loader.load(keepCurrent: true));
    return result;
  }

  /// Closes every other session after a step-up. Returns how many closed, or
  /// [ActionSkipped] when the user declines the step-up.
  Future<ActionResult<int>> closeOthers() async {
    if (!await _stepUp.ensure()) return const ActionSkipped();
    final result = await _runner.run(_repository.revokeOtherSessions);
    if (result is ActionSucceeded<int>) unawaited(_loader.load(keepCurrent: true));
    return result;
  }

  @override
  void dispose() {
    _loader.dispose();
    _runner.dispose();
    super.dispose();
  }
}
```

La pantalla queda así:

```dart
class SessionsScreen extends StatelessWidget {
  const SessionsScreen({super.key, required this.repository, required this.requestStepUp});

  final AccountRepository repository;
  final Future<bool> Function() requestStepUp;

  @override
  Widget build(BuildContext context) => ControllerBuilder<SessionsController>(
    create: (context) => SessionsController(
      repository,
      stepUp: StepUpGate.fromContext(
        context,
        rule: AccountAccess.stepUp,
        request: requestStepUp,
      ),
    )..start(),
    builder: (context, controller) => AppPage(
      title: AccountLocalizations.of(context).sessionsTitle,
      body: AsyncValueView<List<SessionSummary>>(
        value: controller.sessions,
        errorMessage: AccountLocalizations.of(context).loadError,
        onRetry: controller.start,
        data: (sessions) => SessionsList(sessions, onClose: (id) async {
          final result = await controller.closeSession(id);
          if (!context.mounted) return;
          showActionResult(context, result, success: AccountLocalizations.of(context).sessionClosed);
        }),
      ),
    ),
  );
}
```

Catálogo de controladores (estado tipado entre paréntesis cuando no basta `AsyncValue`):

| Paquete       | Controlador                                                                                                                     | Estado y métodos principales                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| account       | `SessionsController`                                                                                                            | arriba                                                                                                                                                                 |
| account       | `DevicesController`                                                                                                             | `AsyncValue<List<DeviceSummary>>`, `revoke(id)`, `rename(id, name)`                                                                                                    |
| account       | `SecurityController`                                                                                                            | `AsyncValue<SecuritySnapshot>`, `enableTotp()`, `regenerateCodes()` devuelve `ActionResult<List<String>>` (los `codes` dejan de capturarse en un closure)              |
| account       | `AgreementsController`                                                                                                          | `AsyncValue<List<AgreementItem>>`, `accept(id)`                                                                                                                        |
| account       | `AccountOverviewController`                                                                                                     | `AsyncValue<AccountOverview>`                                                                                                                                          |
| backoffice    | `SagasController`, `SagaDetailController`, `DlqController`, `TenantsController`, `TenantDetailController`, `OverviewController` | `AsyncLoader` por pantalla; `SagaDetailController` carga saga y bitácora con `Future.wait`; `DlqController.retry(id)` y `discard(id, reason)` devuelven `ActionResult` |
| billing       | `BillingPlanController`, `InvoicesController`, `InvoiceDetailController`, `ChangePlanController`                                | ver sealed abajo                                                                                                                                                       |
| notifications | `InboxController`, `PreferencesController`                                                                                      | ver sealed abajo                                                                                                                                                       |
| tasks         | `TaskFormController`, `TaskDetailController`                                                                                    | ver sealed abajo; `TasksListController` ya existe                                                                                                                      |
| verifier      | `VerifierController`                                                                                                            | ver sealed abajo                                                                                                                                                       |
| assistant     | `AssistantChatController` (rehecho)                                                                                             | ver sealed abajo                                                                                                                                                       |

Los nombres de campos de los tipos de contrato (`DeviceSummary`, `SecuritySnapshot`, etc.) son ilustrativos: el guía de cada paquete usa los reales.

Estados sealed de las pantallas que no son una carga simple:

```dart
// billing: ChangePlanController
sealed class ChangePlanState { const ChangePlanState(); }
final class ChangePlanLoading extends ChangePlanState { const ChangePlanLoading(); }
final class ChangePlanChoosing extends ChangePlanState {
  const ChangePlanChoosing(this.plans, this.selectedId);
  final List<Plan> plans;
  final String? selectedId;
}
final class ChangePlanSaving extends ChangePlanState {
  const ChangePlanSaving(this.plans, this.selectedId);
  final List<Plan> plans;
  final String selectedId;
}
final class ChangePlanFailed extends ChangePlanState {
  const ChangePlanFailed(this.plans, this.selectedId, this.error);
  final List<Plan> plans;
  final String? selectedId;
  final Object error;
}
final class ChangePlanDone extends ChangePlanState { const ChangePlanDone(); }

// notifications: InboxController
/// [live] arrivals wait in the controller while a save runs; a failed save
/// reverts only the `read` flag of the affected ids, never the list.
final class InboxController extends ChangeNotifier {
  InboxController(NotificationsRepository repository);
  AsyncValue<List<AppNotification>> get inbox;
  int get unreadCount;
  Future<void> start();
  Future<ActionResult<void>> markRead(String id);
  Future<ActionResult<void>> markAllRead();
}

// notifications: PreferencesController. Saves one at a time, the latest wins.
final class PreferencesController extends ChangeNotifier {
  PreferencesController(NotificationsRepository repository);
  AsyncValue<NotificationPreferences> get preferences;
  Future<void> start();
  void setChannel(NotificationChannel channel, {required bool enabled});
  void setQuietStart(TimeOfDay time);
  void setQuietEnd(TimeOfDay time);
}

// tasks
sealed class TaskFormState { const TaskFormState(); }
final class TaskFormLoading extends TaskFormState { const TaskFormLoading(); }
final class TaskFormLoadFailed extends TaskFormState {
  const TaskFormLoadFailed(this.error);
  final Object error;
}
final class TaskFormEditing extends TaskFormState {
  const TaskFormEditing({this.task, this.fieldErrors = const {}});
  final Task? task;
  final Map<String, String> fieldErrors;
}
final class TaskFormSaving extends TaskFormState { const TaskFormSaving(); }
final class TaskFormSaved extends TaskFormState {
  const TaskFormSaved(this.taskId);
  final String taskId;
}

sealed class TaskDetailState { const TaskDetailState(); }
final class TaskDetailShowing extends TaskDetailState {
  const TaskDetailShowing(this.task);
  final AsyncValue<Task> task;
}
final class TaskDetailDeleting extends TaskDetailState { const TaskDetailDeleting(); }
final class TaskDetailDeleted extends TaskDetailState { const TaskDetailDeleted(); }

// verifier
sealed class VerifierState { const VerifierState(); }
final class VerifierWaiting extends VerifierState { const VerifierWaiting(); }
final class VerifierChallenge extends VerifierState {
  const VerifierChallenge({
    required this.challenge,
    required this.code,
    required this.secondsLeft,
    required this.copied,
  });
  final PendingChallenge challenge;
  final String code;
  final int secondsLeft;
  final bool copied;
}
final class VerifierDenying extends VerifierState { const VerifierDenying(); }
final class VerifierBlocked extends VerifierState { const VerifierBlocked(); }
final class VerifierFailed extends VerifierState {
  const VerifierFailed(this.error);
  final Object error;
}

final class VerifierController extends ChangeNotifier {
  /// [tick] is the period of the countdown; [clock] and `expiresAt` give the
  /// seconds left, so a backgrounded app does not drift.
  VerifierController(
    VerifierRepository repository, {
    required Clock clock,
    Duration tick = const Duration(seconds: 1),
  });
  VerifierState get state;
  Future<void> start();
  Future<ActionResult<void>> approve();
  Future<ActionResult<void>> deny();
  void markCopied();
}

// assistant
sealed class ChatState { const ChatState(); }
final class ChatLoading extends ChatState { const ChatLoading(); }
final class ChatReady extends ChatState {
  const ChatReady(this.messages, this.answer);
  final List<ChatMessage> messages;
  final AnswerState answer;
}
final class ChatFailed extends ChatState {
  const ChatFailed(this.error);
  final Object error;
}

sealed class AnswerState { const AnswerState(); }
final class AnswerIdle extends AnswerState { const AnswerIdle(); }
final class AnswerStreaming extends AnswerState {
  const AnswerStreaming(this.messageId);
  final String messageId;
}
final class AnswerFailed extends AnswerState {
  const AnswerFailed(this.kind);
  final ChatFailureKind kind;
}

enum ChatFailureKind { quotaExceeded, generic }
```

Los nombres de campos de esos tipos de contrato (`Plan`, `PendingChallenge`, `ChatMessage`) son los del código existente; el guía los confirma al escribir el esqueleto.

### 3.4 `StatusColors` y tokens

`ColorPalette` tiene `successBase/On` y `warningBase/On` y no tiene `info`. `AppTheme` no los lleva al tema. Se agrega `info` a `design-tokens.json` y a `tokens`, y una extensión de tema:

```dart
// packages/ui/lib/src/theme/status_colors.dart
@immutable
final class StatusColors extends ThemeExtension<StatusColors> {
  const StatusColors({
    required this.success,
    required this.onSuccess,
    required this.successContainer,
    required this.onSuccessContainer,
    required this.warning,
    required this.onWarning,
    required this.warningContainer,
    required this.onWarningContainer,
    required this.info,
    required this.onInfo,
    required this.infoContainer,
    required this.onInfoContainer,
  });

  /// Builds the roles from [palette]. Containers are the base color blended
  /// over the surface, so they stay readable in dark mode.
  factory StatusColors.fromPalette(ColorPalette palette);

  final Color success, onSuccess, successContainer, onSuccessContainer;
  final Color warning, onWarning, warningContainer, onWarningContainer;
  final Color info, onInfo, infoContainer, onInfoContainer;

  @override
  StatusColors copyWith({Color? success /* ... */});

  @override
  StatusColors lerp(StatusColors? other, double t);
}

extension StatusColorsContext on BuildContext {
  /// The status roles of the current theme.
  StatusColors get statusColors => Theme.of(this).extension<StatusColors>()!;
}
```

`AppTheme._build` registra `StatusColors.fromPalette(palette)` y agrega `FilledButtonThemeData`, `OutlinedButtonThemeData` e `InputDecorationTheme` con `minimumSize` de 48 (decisión 8.2). `tokens` suma `AppRadius.full`, `AppIconSize` (`sm`, `md`, `xl`) y `AppLayout` (`listPaneWidth` 360, `readingWidth` 720, `wideContentWidth` 1100). `ui` suma `ContentColumn` (un `Center` con `ConstrainedBox`) y la extensión `context.localeTag`, que reemplaza a las dos funciones `localeTag` de account y billing. Los valores hexadecimales de `info` y los contenedores se validan con `textContrastGuideline` en claro y oscuro; el guía de P1.1 los fija.

### 3.5 Errores sin dominio en `ui`

`i18n` suma la dependencia de `contracts` (que solo depende de `meta`, sin ciclo) y absorbe el mapeo:

```dart
// packages/i18n/lib/src/error_presenter.dart
@immutable
final class ErrorDetails {
  const ErrorDetails({required this.message, this.code, this.traceId});
  final String message;
  final String? code;
  final String? traceId;
}

final class ErrorPresenter {
  const ErrorPresenter(this.l10n);
  final AppLocalizations l10n;

  /// Message, code and trace id to show for [error]. An `ApiErrorException`
  /// gives the catalog message of its code; anything else gives
  /// [fallbackMessage] or the generic text.
  ErrorDetails describe(Object error, {String? fallbackMessage});

  /// Message of a failed user action (what `actionErrorMessage` returns today).
  String actionMessage(Object error);
}
```

`ErrorView` recibe un `ErrorDetails`. `ErrorView.fromException` y `actionErrorMessage` se conservan con la misma firma y delegan en `ErrorPresenter`, así los microfrontends no cambian en este paso. `AccountAsyncView` y `AsyncBody` desaparecen cuando sus dueños migran.

### 3.6 `DeferredLibraryLoader`

Reemplaza al mapa global `_libraryLoads` y a `resetDeferredPageCache()`. El caché vive en la instancia; `ShellHost` crea una y la entrega al router.

```dart
// packages/shell_core/lib/src/deferred_library_loader.dart
final class DeferredLibraryLoader {
  /// [loading] and [errorBuilder] are the shell's defaults for pages that do
  /// not bring their own.
  DeferredLibraryLoader({
    this.loading,
    this.errorBuilder,
  });

  final Widget? loading;
  final Widget Function(Object error, VoidCallback retry)? errorBuilder;

  /// Loads a library once per instance. A failed load is forgotten so it can
  /// be retried.
  Future<void> load(Future<void> Function() loadLibrary);

  /// A page that shows [loading] until the library loads, then [builder].
  /// Matches [ScreenLoader], so `loader.page` can be passed where one is
  /// expected.
  Widget page({
    required Future<void> Function() loadLibrary,
    required Widget Function() builder,
    Widget? loading,
    Widget Function(Object error, VoidCallback retry)? errorBuilder,
  });
}
```

Las pruebas crean una instancia propia: no hay reset y desaparecen los `loadNow` de `tasks` y `assistant`. `deferredPage`, `resetDeferredPageCache` y `shellScreenLoader` quedan como legado hasta la oleada 4.

### 3.7 `ScreenRoute.deferred`

```dart
/// Builds a deferred screen. [params] unites the path and query parameters.
typedef DeferredScreenBuilder = Widget Function(
  MicrofrontendScope scope,
  Map<String, String> params,
);

class ScreenRoute {
  // existing const constructor stays: this one calls it.

  /// One-liner for a screen whose library loads on demand. The loading view
  /// is the shell's default unless [loading] is given.
  factory ScreenRoute.deferred(
    String path, {
    required Future<void> Function() library,
    required DeferredScreenBuilder build,
    String? name,
    AccessRule? access,
    Widget? loading,
    List<ScreenRoute> routes = const [],
  });
}

extension ScreenParamsX on Map<String, String> {
  /// The parameter [name]; throws [StateError] when the route did not define it.
  String require(String name);
}
```

Cada ruta pasa de 6 líneas a 3.

### 3.8 `DeferredLocalizations`

Reemplaza a los siete `_localized` y a `BackofficeLocalized`. Además registra los delegados para los diálogos:

```dart
class DeferredLocalizations extends StatelessWidget {
  const DeferredLocalizations({
    super.key,
    required this.delegates,
    required this.child,
  });

  final List<LocalizationsDelegate<Object?>> delegates;
  final Widget child;
}

/// Dialogs and sheets are routes of the navigator, siblings of the page, so
/// they do not inherit the page's localizations. These reapply the delegates
/// of the nearest [DeferredLocalizations].
extension LocalizedOverlays on BuildContext {
  Future<T?> showLocalizedDialog<T>({
    required WidgetBuilder builder,
    bool barrierDismissible = true,
  });

  Future<T?> showLocalizedSheet<T>({
    required WidgetBuilder builder,
    bool isScrollControlled = false,
  });
}
```

`showBackofficeDialog` se reemplaza por `showLocalizedDialog`. Si no hay un `DeferredLocalizations` arriba, el helper lanza un `FlutterError` claro.

### 3.9 `RepositoryBinding`

Reemplaza a las cuatro funciones `_repository(scope)` y a su `switch` repetido:

```dart
// packages/shell_core/lib/src/repository_binding.dart
final class RepositoryBinding<T extends Object> {
  const RepositoryBinding({required this.demo, required this.live});

  /// For a microfrontend whose `modes` is `{ShellMode.demo}`.
  const RepositoryBinding.demoOnly({required this.demo}) : live = null;

  final T Function(ShellServices services) demo;
  final T Function(ShellServices services)? live;

  /// The repository of [scope]: created on first use by mode, and disposed
  /// by the scope (it implements `ScopedResource`).
  T resolve(MicrofrontendScope scope);
}

extension RepositoriesOfScope on MicrofrontendScope {
  T repository<T extends Object>(RepositoryBinding<T> binding);
}
```

Cada microfrontend declara el suyo en `data/<id>_data.dart`:

```dart
abstract final class TasksData {
  static final repository = RepositoryBinding<TasksRepository>.demoOnly(
    demo: (services) => FakeTasksRepository(behavior: DemoBehavior()),
  );
}
```

Ese archivo va dentro de `data/`, que es una carpeta diferida: el manifiesto no lo importa.

### 3.10 `DemoBehavior`

Una pieza de composición para los seis fakes: latencia, fallos programables y cierre. Cada fake la recibe por constructor.

```dart
// packages/shell_core/lib/src/demo_behavior.dart
final class DemoBehavior {
  DemoBehavior({this.delay = Duration.zero, Clock clock = systemClock});

  /// Artificial wait of every response.
  final Duration delay;

  /// The fake's current time (never `DateTime.now()` inside a fake).
  DateTime now();

  /// Whether [dispose] ran.
  bool get isDisposed;

  /// Waits [delay], then throws the next failure that applies, or returns
  /// [compute]. [operation] tags the call (an enum value of the fake) so a
  /// failure can target one operation. After [dispose] it throws
  /// [DemoDisposedException].
  Future<T> respond<T>(T Function() compute, {Object? operation});

  /// Makes the next [count] calls (of [operation], or of any when null) throw
  /// [error].
  void failNext(Object error, {int count = 1, Object? operation});

  void dispose();
}

final class DemoDisposedException implements Exception {
  const DemoDisposedException();
}
```

`notifications` conserva su `StreamController` de llegadas en vivo; solo la latencia y los fallos (`fetchError`, `markError`, `saveError`) pasan a `failNext(error, operation: NotificationsOperation.markRead)`. El generador UUIDv7 de `tasks` sale a su clase propia (TK2):

```dart
final class UuidV7Generator {
  UuidV7Generator({Clock clock = systemClock, Random? random});
  String next();
}
```

### 3.11 `StepUpGate` (account)

```dart
// microfrontends/account/lib/src/screens/step_up_gate.dart
final class StepUpGate {
  StepUpGate({
    required AccessRule rule,
    required ValueListenable<UserSession> session,
    required Clock clock,
    required Future<bool> Function() request,
  });

  /// Reads the session and clock of the nearest `ShellAccessScope`.
  factory StepUpGate.fromContext(
    BuildContext context, {
    required AccessRule rule,
    required Future<bool> Function() request,
  });

  /// True when the session already passes [rule]; otherwise asks the shell
  /// for a step-up and returns whether the user verified.
  Future<bool> ensure();
}
```

Solo `account` pide step-up hoy, así que la clase vive en `account` y no en `shell_core`. Si otro microfrontend la necesita, sube a `shell_core` sin cambiar la firma.

### 3.12 `ShellNavigator` y `ShellRouterFactory` (shell_core)

Reemplazan a `homeLocation`, `signOutAndGoToLogin`, `buildShellRouter` y `redirectFor`. `accessRedirect(rule)` y `AccessGate` siguen siendo públicas: son parte del contrato del ADR 0018.

```dart
final class ShellNavigator {
  ShellNavigator({
    required MicrofrontendRegistry registry,
    required ValueNotifier<UserSession> session,
    required AppPlatform platform,
    required ShellPaths paths,
  });

  /// Called once, after the router exists.
  void attach(GoRouter router);

  /// Path of the first menu entry the session sees, or null.
  String? home();

  /// [home], else forbidden for a signed-in user and login for anonymous.
  String landing();

  /// Resets the session to anonymous and goes to the plain login page.
  Future<void> signOutAndGoToLogin();
}

final class ShellRouterFactory {
  ShellRouterFactory({
    required MicrofrontendRegistry registry,
    required AppPlatform platform,
    required ShellRuntime runtime,
    required DeferredLibraryLoader loader,
    ShellPaths paths = const ShellPaths(),
    Clock? clock,
  });

  /// Validates paths, wraps every page with the identity epoch and the access
  /// scope, and returns the router. Throws [StateError] on a route outside
  /// its microfrontend's segment.
  GoRouter build({
    required List<RouteBase> routes,
    required ShellRouteBuilder shellBuilder,
  });
}
```

### 3.13 División de `ShellHost` (shell_host)

`ShellHost` conserva su constructor actual como `factory`, así que las dos apps no cambian hasta la oleada 4. El constructor generativo recibe las piezas.

```dart
final class MenuBadges {
  MenuBadges({required MicrofrontendRegistry registry, required ShellEventBus bus});

  /// Count of each entry with a badge, by entry path.
  ValueListenable<Map<String, int>> get counts;
  int? countFor(MenuEntry entry);

  /// Back to empty, for a new identity.
  void reset();
  Future<void> dispose();
}

/// Follows the access of a real connection: the session mirrors it, and
/// when identity closes the session the user goes back to sign-in.
final class SessionBinding {
  SessionBinding({
    required IdentityConnection connection,
    required ValueNotifier<UserSession> session,
    required ShellNavigator navigator,
  });
  void start();
  void stop();
}

/// The shell's own routes: root, login, forbidden and step-up.
final class ShellRoutes {
  ShellRoutes({
    required ShellPaths paths,
    required ValueNotifier<UserSession> session,
    required ShellNavigator navigator,
    required StepUpRequests stepUp,
    required Future<void> Function() onSignOut,
    required List<DemoProfile> demoProfiles,
    Clock clock = systemClock,
    IdentityConnection? connection,
  });
  List<RouteBase> build();
}

final class ShellHost {
  /// Composition from ready pieces. Tests of one piece use this.
  ShellHost.compose({
    required this.platform,
    required this.registry,
    required this.session,
    required this.runtime,
    required this.router,
    required this.navigator,
    required this.badges,
    required this.stepUp,
    required this.scaffoldMessengerKey,
    this.binding,
    this.connection,
  });

  /// Same arguments as today: builds every piece in the right order.
  factory ShellHost({
    required AppPlatform platform,
    required List<MicrofrontendManifest> manifests,
    required ShellScaffoldBuilder scaffold,
    IdentityConnection? connection,
    List<DemoProfile> demoProfiles = DemoProfile.values,
    Clock clock = systemClock,
    DeferredLibraryLoader? loader,
  });
}
```

Para las apps:

```dart
final class ShellDestination {
  const ShellDestination({
    required this.path,
    required this.label,
    required this.icon,
    required this.selectedIcon,
    this.badge,
  });
  final String path, label;
  final IconData icon, selectedIcon;
  final int? badge;
}

/// What a scaffold draws, decided once and tested without widgets. The
/// selected entry is the one with the longest path that matches [location]
/// on a segment boundary (`/tasks2` does not select `/tasks`).
final class ShellMenuModel {
  ShellMenuModel({
    required List<MenuEntry> entries,
    required String location,
    required String languageCode,
    required int? Function(MenuEntry entry) badgeFor,
    this.maxPrimary = 4,
  });

  final int maxPrimary;
  List<ShellDestination> get primary;
  List<ShellDestination> get overflow;
  bool get hasOverflow;

  /// Index in [primary]; the "More" slot when the selection is in [overflow];
  /// -1 when nothing matches.
  int get selectedIndex;
  String? pathAt(int index);
}

final class IdentityConnectionFactory {
  const IdentityConnectionFactory({
    required this.baseUrl,
    required this.transport,
    required this.tokenStore,
  });

  final String baseUrl;
  final HttpTransport Function() transport;
  final TokenStore Function() tokenStore;

  /// Null when [baseUrl] is empty (demo mode).
  IdentityConnection? create();
}
```

### 3.14 `MfaState` (auth)

Reemplaza a `_busy`, `_errorCode`, `_pending` y `_challenge` de `MfaFlow`. Un paso (`MfaStep`) nunca está ocupado ni en error; `MfaBusy` y `MfaFailed` lo envuelven.

```dart
sealed class MfaState {
  const MfaState();

  PendingMfa? get pending;
  MfaChallenge? get challenge;
  String? get errorCode;
  bool get isBusy;
}

sealed class MfaStep extends MfaState {
  const MfaStep();
}

/// Credentials step, or nothing pending.
final class MfaIdle extends MfaStep { const MfaIdle(); }

/// The server asked for a second factor; the user picks a method.
final class MfaAwaitingMethod extends MfaStep {
  const MfaAwaitingMethod(this.pending);
  @override
  final PendingMfa pending;
}

/// A challenge is active; the user types the code.
final class MfaAwaitingCode extends MfaStep {
  const MfaAwaitingCode(this.pending, this.challenge);
  @override
  final PendingMfa pending;
  @override
  final MfaChallenge challenge;
}

/// A call is in flight; [step] is where the flow was.
final class MfaBusy extends MfaState {
  const MfaBusy(this.step);
  final MfaStep step;
}

/// The last call failed with [code]; [step] is where the flow goes back to.
final class MfaFailed extends MfaState {
  const MfaFailed(this.code, this.step);
  final String code;
  final MfaStep step;
}

abstract base class MfaFlow extends ChangeNotifier {
  MfaFlow({MfaState initial = const MfaIdle()});
  MfaState get state;
  // Legacy until wave 4, derived from [state]: pending, challenge, errorCode, busy.
}
```

Los widgets de `shell_host` hacen `switch (flow.state)` exhaustivo. Los comentarios de `auth/flows` pasan a inglés.

### 3.15 `test_utils`

Hoy exporta 3 fakes de auth y el precargador de librerías. Suma lo que siete harness repiten. `test_utils` depende de `ui` (para `AppTheme` y `StatusColors`), `i18n`, `utils` y `go_router`, además de lo que ya tiene.

```dart
// Builds MaterialApp or MaterialApp.router with the shared delegates, a
// session and the theme. Replaces the seven copies of testApp/pumpApp.
final class TestApp {
  const TestApp({
    this.locale = const Locale('es'),
    this.delegates = const [],
    this.session,
    this.clock,
  });

  final Locale locale;

  /// Delegates of the microfrontend under test, added to the shared ones.
  final List<LocalizationsDelegate<Object?>> delegates;
  final UserSession? session;
  final Clock? clock;

  Widget wrap(Widget home);
  Widget wrapRouter(GoRouter router);
  Future<void> pump(WidgetTester tester, Widget home);
}

final class SessionBuilder {
  SessionBuilder({String userId = 'user-1', String tenantId = 'tenant-1'});
  SessionBuilder.anonymous();

  SessionBuilder withPermissions(Iterable<Permission> permissions);
  SessionBuilder withRoles(Iterable<PlatformRole> roles);
  SessionBuilder withFeatures(Iterable<PlanFeature> features);
  SessionBuilder withFlags(Iterable<FeatureFlag> flags);
  SessionBuilder mfaVerifiedAt(DateTime at);
  UserSession build();
}

abstract final class ProblemFixtures {
  static ProblemDetails unavailable({String traceId = 'trace-123'});
  static ProblemDetails forbidden({String traceId = 'trace-123'});
  static ProblemDetails notFound({String traceId = 'trace-123'});
  static ProblemDetails withCode(String code, {int status = 400});
}

/// A scope over demo services, with the repository already registered.
final class TestScope {
  TestScope({String userId = 'user-1', ShellMode mode = ShellMode.demo});
  MicrofrontendScope get scope;
  TestScope with<T extends Object>(T repository);
}

/// Runs the four tap-target and contrast guidelines on what is on screen.
Future<void> expectAccessible(WidgetTester tester);

/// Pumps [home] at each width and calls [check] with it.
Future<void> pumpAtWidths(
  WidgetTester tester,
  Widget home, {
  List<double> widths = const [320, 800, 1280],
  Future<void> Function(double width)? check,
});

/// Sets the text scale (2.0 for the accessibility check) for the test.
Future<void> pumpAtTextScale(WidgetTester tester, Widget home, {double scale = 2.0});

/// Preloads the deferred libraries of manifests in `setUpAll`.
/// Renamed from `DeferredLibrariesLoader`, which stays as legacy until
/// wave 4 so it is not confused with `DeferredLibraryLoader` of shell_core.
final class DeferredLibrariesPreloader {
  const DeferredLibrariesPreloader();
  Future<void> load(Iterable<MicrofrontendManifest> manifests);
}
```

Las pruebas de `tasks`, `account` y las demás usan `TestApp` y borran su `testApp`, `pumpApp`, `loadNow`, `billingSession` y `unavailableProblem`. `setSurface` se mueve de `ui/test/utils/pump.dart` a `test_utils` solo si `ui` no lo necesita; si lo necesita, se copia (el costo es una función de 6 líneas, y `ui` no puede depender de `test_utils`).

Las pruebas viven en `test/utils/` (no `test/support.dart`) como pide `front-pruebas`.

### 3.16 Suite compartida de escenarios de shell

Vive en `packages/test_utils/lib/src/shell/scenarios/`. Cada app implementa un `ShellFixture` que arma su `ShellHost` con su marco; la suite solo toca los tipos de `shell_core` y `auth`, así que `test_utils` no depende de `shell_host`.

```dart
/// What a scenario needs from the app under test.
abstract interface class ShellFixture {
  /// Pumps the app with [setup] and returns handles to observe it.
  Future<ShellUnderTest> pump(WidgetTester tester, ShellScenarioSetup setup);
}

final class ShellScenarioSetup {
  const ShellScenarioSetup({
    required this.manifests,
    required this.clock,
    this.live = false,
    this.auth,
    this.initialLocation = '/',
  });
  final List<MicrofrontendManifest> manifests;
  final FakeClock clock;

  /// True: a real connection over [auth]. False: demo profiles.
  final bool live;
  final FakeAuthRepository? auth;
  final String initialLocation;
}

final class ShellUnderTest {
  const ShellUnderTest({
    required this.session,
    required this.currentLocation,
    required this.router,
  });
  final ValueNotifier<UserSession> session;
  final String Function() currentLocation;
  final GoRouter router;
}

/// Registers the shared scenarios: sign-in that keeps `from`, sign-out,
/// forbidden page, step-up redirect, step-up of an action, MFA at login,
/// identity switch and deep link after restoring the session.
void defineShellScenarios(ShellFixture fixture, {String platform = 'shell'});
```

Cada app queda solo con lo suyo: el menú de su plataforma, el "Más" del móvil y `deep_link_mapper`.

### 3.17 Reglas nuevas del script y línea base

`check-structure.mjs` suma estas reglas, todas baratas (expresiones regulares sobre `lib/`):

| Regla                                                                                                       | Dónde aplica                                                                                             |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Color(0x` o `Colors.`                                                                                      | `lib/` de microfrontends (permitido en `tokens` y `ui/theme`)                                            |
| `catch (` sin `on`                                                                                          | `lib/` de todo, salvo `contracts`; se permite con la marca `// catch-all: <motivo>` en la línea anterior |
| `Text('` con literal                                                                                        | `screens/`                                                                                               |
| `widget.repository.`                                                                                        | `screens/`                                                                                               |
| `Alignment.centerLeft`, `Alignment.centerRight`, `EdgeInsets.fromLTRB`, `BorderRadius.circular(` con número | `lib/` de microfrontends                                                                                 |
| `${l10n.` seguido de `:` o ` ·`                                                                             | `lib/` de microfrontends y `ui`                                                                          |
| `DateTime.now()`                                                                                            | todo `lib/`, salvo `utils/lib/src/clock.dart` (ya existe, se ajusta la excepción)                        |
| `: ^` en `pubspec.yaml` de miembros                                                                         | todo (tras P0.1)                                                                                         |

Como esas reglas marcarían el código que todavía no migró, se agrega una línea base: `front/tools/structure-baseline.json` con las violaciones actuales por archivo y regla. `--all` falla solo por violaciones fuera de la línea base. `--changed` ignora la línea base para los archivos tocados: un archivo que se toca debe quedar limpio. Una entrada que ya no aplica es un aviso, no un fallo. Ninguna tropa de las oleadas 1 a 3 edita la línea base; en la oleada 4 se regenera, se comprueba que quedó vacía y se borra.

## 4. Oleadas y paquetes de trabajo

### 4.1 Mapa

| Oleada | Tropa A                         | Tropa B                           | Tropa C                      |
| ------ | ------------------------------- | --------------------------------- | ---------------------------- |
| 0      | P0.1 reloj y versiones          | P0.2 script y línea base          | P0.3 ADR 0024                |
| 1      | P1.1 ui, tokens, i18n           | P1.2 shell_core y utils           | P1.3 test_utils, auth, api   |
| 2      | P2.1 shell_host                 | P2.2 account                      | P2.3 backoffice              |
| 3      | P3.1 billing y notifications    | P3.2 tasks y verifier             | P3.3 assistant               |
| 4      | P4.1 apps y suite de escenarios | P4.2 retiro de lo legado y script | P4.3 skills, ADR y generador |

Dependencias entre oleadas: la 1 necesita la 0 (el `Clock` de `utils`). Las 2 y 3 necesitan la 1 completa (`ui`, `shell_core`, `test_utils`). Los microfrontends no dependen de P2.1, por eso van en la 2 y la 3 sin orden entre sí. P4.1 necesita P2.1 y P1.3. P4.2 necesita que las oleadas 2 y 3 hayan migrado todo. P4.3 necesita la 1 (API) y la 3 (un microfrontend de referencia).

### 4.2 Oleada 0: preludio

Es corta: tres paquetes S que dejan el terreno listo y ya no se tocan.

**P0.1 Reloj y versiones.** Esfuerzo S.

- Carpetas: `packages/utils/lib/src/clock.dart` y `utils/lib/utils.dart`, `packages/utils/test/clock_test.dart`, `packages/auth/lib/src/session_manager.dart` (solo el `typedef`), `packages/test_utils/lib/src/clock/**`, `packages/test_utils/lib/test_utils.dart`, `packages/test_utils/test/clock/**` y todos los `pubspec.yaml` de miembros del workspace.
- Cierra: I2 (parte `utils` y `auth`), A2, M3, TU3.
- Produce: `Clock` y `systemClock` en `utils`; `FakeClock` en `test_utils`; dependencias `auth`, `shell_core`, `shell_host` y `test_utils` hacia `utils`; versiones exactas de `go_router`, `intl`, `material_ui`, `flutter_lints`, `lints` y `test`; `sdk: ^3.14.0` en `test_utils`. Consume: nada.
- Aceptación: pruebas de `systemClock` y `FakeClock` (avanza, salta, no se mueve solo); `grep -rn ": \^" front --include=pubspec.yaml` no devuelve miembros del workspace; `pnpm nx run-many -t format-check analyze test --projects=front-utils,front-auth,front-test_utils,front-shell_core,front-shell_host,front-ui,front-i18n`; `pnpm nx run-many -t analyze --projects=front-mf_account,front-mf_assistant,front-mf_backoffice,front-mf_billing,front-mf_notifications,front-mf_tasks,front-mf_verifier,front-web_shell,front-mobile_shell`; `check-structure.mjs --changed .`.
- Haiku 1: `Clock`, `systemClock`, su prueba, el `typedef` de `auth` (se cambia por import) y `FakeClock` con su prueba. Haiku 2: los `pubspec.yaml` (versiones exactas y dependencias nuevas) y la verificación de `flutter pub get`.

**P0.2 Script y línea base.** Esfuerzo M.

- Carpetas: `.claude/skills/front-estructura/scripts/**`, `front/tools/structure-baseline.json` (nuevo), `front/tools/nx-plugin/**` (si el target `analyze` del script lo necesita) y `front/build/`.
- Cierra: TL1 (reglas baratas) y AP4 (borrado local).
- Produce: las reglas de 3.17, la línea base y `--update-baseline`; pruebas del script con `node --test` en `check-structure.test.mjs`. Consume: nada.
- Aceptación: `node --test .claude/skills/front-estructura/scripts/` con un caso verde y uno rojo por regla; `check-structure.mjs --all .` sale en verde con la línea base recién generada; si se agrega una violación nueva, sale en rojo; `--changed` rechaza una violación nueva en un archivo tocado aunque esté en la línea base.
- Haiku 1: las reglas de microfrontend (colores, `widget.repository.`, direccionalidad, texto). Haiku 2: las reglas de `catch`, `DateTime.now()`, versiones en `pubspec`, la línea base y las pruebas.

**P0.3 ADR 0024.** Esfuerzo S.

- Carpetas: `docs/adr/0024-*.md` y `docs/adr/README.md`.
- Cierra: nada directo. Registra las decisiones 3.1 a 3.17 como ADR en estado "Propuesta", como exige `CLAUDE.md` para una decisión de arquitectura. Se pasa a "Aceptada" cuando el usuario dé el visto bueno de la sección 8.
- Aceptación: sigue `docs/adr/0000-plantilla.md`; enlaza ADR 0012, 0015 y 0018; el índice lista el 0024.
- Haiku 1: contexto, decisión y consecuencias. Haiku 2: alternativas consideradas (las de la sección 1.2) y el índice.

### 4.3 Oleada 1: fundamentos

Los tres paquetes son aditivos (salvo `AccessRule`, ver 2.2) y tienen carpetas disjuntas.

**P1.1 ui, tokens, i18n.** Esfuerzo L.

- Carpetas: `packages/ui/**`, `packages/tokens/**` (incluye `design-tokens.json`), `packages/i18n/**`.
- Cierra: U1, U2, U3, U4 (parte real), U5, U6, U7, T1, I3 (la parte de `ui`: `error_view` y el separador `MetaLine`), AC7 (extensión `context.localeTag`).
- Produce: `AsyncValue` (archivo propio), `AsyncLoader`, `ActionRunner`, `ControllerBuilder`, `showActionResult`, `StatusColors`, `ContentColumn`, `MetaLine`, `context.localeTag`, `ErrorDetails` y `ErrorPresenter` (en `i18n`), `AppRadius.full`, `AppIconSize`, `AppLayout`, rol `info`, temas de botón y de campo. Consume: `utils` solo si `ui` lo necesita (no).
- Cambios de accesibilidad: `LoadingView` con `Semantics(liveRegion: true, label: l10n.loading)` y `semanticsLabel` en el indicador (la clave ya existe); el mensaje de `ErrorView` en región viva; `AppCard` con `Semantics(button: true)` cuando hay `onTap`; el spinner de `AppButton` con etiqueta.
- Aceptación (pruebas por pieza):
  - `AsyncLoader`: una respuesta vieja no pisa una nueva; no notifica tras `dispose`; `setData` invalida un fetch en curso; un `StateError` del fetch escapa.
  - `ActionRunner`: los tres modos de concurrencia; `Exception` da `ActionFailed`, `Error` escapa; `dispose` en medio de una acción no lanza.
  - `ControllerBuilder`: crea una vez, reconstruye al notificar, hace `dispose`.
  - `StatusColors`: `textContrastGuideline` en claro y oscuro para cada par; `lerp`.
  - Componentes base: `meetsGuideline(androidTapTargetGuideline)`, `iOSTapTargetGuideline`, `labeledTapTargetGuideline`, `textContrastGuideline`; prueba a 2x de escala; `tokens` sigue coincidiendo con `design-tokens.json`.
  - `ErrorPresenter`: código de catálogo, `ContractViolationException`, error genérico; `ErrorView` ya no importa `contracts` (`grep` vacío).
  - Comandos: `pnpm nx run-many -t format-check analyze test --projects=front-ui,front-tokens,front-i18n`; `analyze` y `test` de los siete microfrontends y de `front-shell_host`, `front-web_shell`, `front-mobile_shell` (compatibilidad); `check-structure.mjs --changed .`.
- Haiku 1: `lib/src/state/**` (`AsyncValue`, `AsyncLoader`, `ActionRunner`), `ControllerBuilder`, `showActionResult` y sus pruebas. Haiku 2: `tokens`, `StatusColors`, temas, componentes accesibles, `ContentColumn`, `MetaLine`, `ErrorPresenter` y ARB. El guía edita `ui.dart`, `tokens.dart` e `i18n.dart`.
- Riesgo propio: el cambio de `guard` rompe pruebas que usan `StateError` como falla (sección 6). El guía lista esas pruebas antes de empezar y las cambia en el mismo paquete cuando son de `ui`; las de microfrontends se cambian en su oleada.

**P1.2 shell_core y utils.** Esfuerzo L.

- Carpetas: `packages/shell_core/**`, `packages/utils/lib/src/money*.dart`, `packages/utils/test/money*`. Excepción pactada: una línea en cada uno de `microfrontends/{assistant,backoffice,billing,tasks,verifier}/test/manifest_test.dart` para pasar `now: DateTime.utc(2026, 1, 1)`.
- Cierra: SC1, SC2, SC3, SC4 (documentar el parámetro), I1, M1 (parte shell), M2 (parte shell), AC5 (la base), B5 (la base), AC2 queda para `account`.
- Produce: `AccessRule` con `now` obligatorio; `DeferredLibraryLoader`; `ShellNavigator`; `ShellRouterFactory`; `ScreenRoute.deferred` y `ScreenParamsX`; `DeferredLocalizations` y `LocalizedOverlays`; `RepositoryBinding`; `DemoBehavior` y `DemoDisposedException`; `MoneyFormatter`. Se conservan como legado `deferredPage`, `resetDeferredPageCache`, `buildShellRouter`, `homeLocation`, `signOutAndGoToLogin` y `redirectFor`. Consume: `Clock` de P0.1.
- `MoneyFormatter`:

  ```dart
  final class MoneyFormatter {
    MoneyFormatter({required String locale});
    /// Caches the `NumberFormat` per currency; the decimals come from a small
    /// ISO 4217 table, so no second format is built per call.
    String format(MoneyAmount value);
  }
  ```

  `formatMoney` sigue existiendo y delega.

- Aceptación:
  - `access_rule_test`, `mfa_rule_test` y `user_session_test` pasan con `now` explícito; `grep -rn "DateTime.now()" packages/shell_core/lib` vacío.
  - `DeferredLibraryLoader`: una carga por instancia; una carga fallida se reintenta; dos instancias no comparten caché; `page` muestra `loading` y luego el contenido.
  - `ScreenRoute.deferred`: la ruta construye con el scope y los `params` (gana el path); `params.require` lanza `StateError` si falta.
  - `DeferredLocalizations`: el texto del delegado llega a la página y a un `showLocalizedDialog`; sin `DeferredLocalizations` arriba lanza un error claro.
  - `RepositoryBinding`: el modo demo y el vivo eligen su fábrica; la instancia es única por scope; el scope la libera; `demoOnly` en modo vivo lanza `StateError`.
  - `DemoBehavior`: latencia, `failNext` con `count` y por `operation`, `dispose` y `DemoDisposedException`.
  - `ShellNavigator`: `home`, `landing` y cierre de sesión (un `/tasks2` no es un `/tasks`).
  - Comandos: `pnpm nx run-many -t format-check analyze test --projects=front-shell_core,front-utils`; `analyze` y `test` de todos los consumidores; `check_deferred_chunks`; `check-structure.mjs --changed .`.
- Haiku 1: `AccessRule` y sus llamadores (`ShellAccessScope`, `context.can`, router y runtime), las pruebas de acceso y las cinco líneas de `manifest_test`. Haiku 2: `DeferredLibraryLoader`, `ScreenRoute.deferred`, `DeferredLocalizations`, `RepositoryBinding`, `DemoBehavior`, `MoneyFormatter` y sus pruebas. El guía escribe `ShellNavigator` y `ShellRouterFactory` (necesitan las piezas de los dos) y los barriles.

**P1.3 test_utils, auth, api.** Esfuerzo M.

- Carpetas: `packages/test_utils/**`, `packages/auth/**`, `packages/api/**`.
- Cierra: TU1 (las piezas), TU2 (los utilitarios), SH2 (el estado), A1, AC6 (comentarios de `auth/flows`).
- Produce: `TestApp`, `SessionBuilder`, `ProblemFixtures`, `TestScope`, `expectAccessible`, `pumpAtWidths`, `pumpAtTextScale`, `DeferredLibrariesPreloader`; `MfaState`, `MfaStep` y subtipos, y `MfaFlow.state` (con los getters viejos derivados). Consume: `Clock` y `FakeClock` de P0.1, `StatusColors` de P1.1 (para `TestApp`, que usa `AppTheme`) y `ScreenRoute` actual de `shell_core`. Como P1.1 corre a la vez, `TestApp` no importa `StatusColors` directamente: importa `AppTheme`, que ya existe. La tropa no depende del código nuevo de `ui` para compilar.
- Aceptación: `TestApp.wrap` y `wrapRouter` montan con el idioma y los delegados dados; `SessionBuilder` produce sesiones iguales a las literales que reemplaza (prueba con tres casos reales); `expectAccessible` falla con un botón de 20 px y pasa con uno de 48; `pumpAtTextScale` aplica 2x. `MfaFlow`: transiciones `MfaIdle` a `MfaAwaitingMethod`, a `MfaAwaitingCode`, `MfaBusy` y `MfaFailed` en cada código de error de `_challengeResetCodes`; un `TypeError` sale tal cual y suelta el estado ocupado. `session_manager.dart:292` usa `on Exception` y las pruebas de refresco siguen verdes. Comandos: `pnpm nx run-many -t format-check analyze test --projects=front-test_utils,front-auth,front-api`; `analyze` y `test` de `front-shell_host` y de los consumidores de `test_utils`; `check-structure.mjs --changed .`.
- Haiku 1: `TestApp`, `SessionBuilder`, `ProblemFixtures`, `TestScope` y pruebas. Haiku 2: `expectAccessible`, `pumpAtWidths`, `pumpAtTextScale`, el preloader, `MfaState` y `A1`.

### 4.4 Oleada 2: shell y dos microfrontends grandes

**P2.1 shell_host.** Esfuerzo L.

- Carpetas: `packages/shell_host/**`.
- Cierra: SH1, SH2 (los widgets), SH3, SH4 (comentario `// catch-all:`), AP1 (el modelo), AP3 (la fábrica).
- Consume: `ShellNavigator`, `ShellRouterFactory`, `DeferredLibraryLoader` (P1.2); `MfaState` (P1.3); `Clock`. Produce: `MenuBadges`, `SessionBinding`, `ShellRoutes`, `ShellHost.compose` y la `factory ShellHost`, `ShellMenuModel`, `ShellDestination`, `IdentityConnectionFactory`; formularios con `switch (flow.state)`, `MfaErrorText` como región viva, `textInputAction` y `keyboardType: number` en el código. `shellScreenLoader` queda como legado.
- Aceptación: `shell_host_test` pasa sin cambios de comportamiento; pruebas nuevas por pieza (`MenuBadges` cuenta y se resetea con la identidad; `SessionBinding` cierra sesión cuando identity la cierra; `ShellRoutes` redirige `/step-up` a login para anónimos; `ShellMenuModel` con `/tasks`, `/tasks2`, `/tasks/42`, desborde y sin selección); `IdentityConnectionFactory.create()` devuelve null con `baseUrl` vacío; los formularios pasan `expectAccessible`. Comandos: `pnpm nx run-many -t format-check analyze test --projects=front-shell_host`; `analyze` y `test` de `front-web_shell` y `front-mobile_shell` (la `factory` no debe romperlos); `check-structure.mjs --changed .`.
- Haiku 1: `MenuBadges`, `SessionBinding`, `ShellRoutes`, `ShellHost.compose`, la `factory` y sus pruebas. Haiku 2: `ShellMenuModel`, `ShellDestination`, `IdentityConnectionFactory` y las páginas (SH2, SH3) con sus pruebas. El guía revisa el orden de construcción de la `factory` (el router necesita las rutas, que necesitan el navegador, y el runtime necesita `signOut` y `requestStepUp`).

**P2.2 account.** Esfuerzo L.

- Carpetas: `microfrontends/account/**`.
- Cierra: AC1, AC2, AC3, AC4, AC5, AC6, AC7 (uso), I3 (en sus archivos: `sessions_screen`, `devices_screen`, `agreements_screen`), M1 y M2 (uso), TU1 (su harness), TU2 (una prueba de accesibilidad por pantalla).
- Consume: `AsyncLoader`, `ActionRunner`, `ControllerBuilder`, `showActionResult`, `ContentColumn`, `MetaLine`, `context.localeTag` (P1.1); `ScreenRoute.deferred`, `DeferredLocalizations`, `RepositoryBinding`, `DemoBehavior` (P1.2); `TestApp`, `SessionBuilder`, `ProblemFixtures`, `FakeClock`, `expectAccessible` (P1.3). Produce: cinco controladores y `StepUpGate`; `AccountData` (binding); `FakeAccountRepository` con `DemoBehavior` y reloj; `AccountScreens`; manifiesto con `.deferred`. Retira: `runAccountAction`, `confirmStepUp`, `runSensitiveAction`, `AccountAsyncView`, `_localized`, `_repository`, `localeTag` propio.
- Aceptación: cada controlador con su prueba sin widgets (carga, error, acción, `ActionSkipped` cuando se rechaza el step-up, un `reload` rápido tras cerrar sesión no pisa datos nuevos: ese es el bug de AC1); `closeOthers` devuelve el número y ya no hay `closed` mutable en un closure; la lista de sesiones queda centrada y con ancho máximo en 1280 (`pumpAtWidths`); `Alignment.centerRight` pasa a `AlignmentDirectional.centerEnd`; los siete accesos a `DateTime.now()` salen; `check-structure.mjs --changed .` en verde sin línea base para sus archivos; `check_deferred_chunks`. Comando: `pnpm nx run-many -t format-check analyze test --projects=front-mf_account`.
- Haiku 1: Sessions, Devices y Overview (controlador, pantalla, pruebas). Haiku 2: Security, Agreements, `StepUpGate`, el fake con `DemoBehavior` y reloj, `AccountData`. El guía hace el manifiesto, `AccountScreens`, los ARB (placeholders de I3) y el harness.

**P2.3 backoffice.** Esfuerzo L.

- Carpetas: `microfrontends/backoffice/**`.
- Cierra: B0 a B5, I3 (20 sitios), M1 y M2 (uso), TU1 y TU2 (su harness y su accesibilidad).
- Consume: lo mismo que P2.2 sin `StepUpGate`. Produce: `SagasController`, `SagaDetailController` (con `Future.wait` de la saga y la bitácora), `DlqController`, `TenantsController`, `TenantDetailController`, `OverviewController`; `BackofficePage` con `CustomScrollView` y `SliverList`; navegación de secciones con `SegmentedButton` o `NavigationBar` que marca la actual; el fake con `DemoBehavior`. Retira: `AsyncBody`, `BackofficeLocalized`, `showBackofficeDialog`, `_SectionNav` con `TextButton`.
- Aceptación: un controlador por pantalla con su prueba (`DlqController.retry` recarga las dos listas y devuelve `ActionResult`); `SagaDetailController` hace las dos cargas en paralelo (prueba con un fake que registra el orden de inicio); los diálogos muestran el texto del ARB del backoffice (`showLocalizedDialog`); la sección actual tiene `Semantics(selected: true)`; las listas largas usan carga perezosa; `Alignment.centerLeft`, `BorderRadius.circular(12)` y el `1100` desaparecen a favor de `AlignmentDirectional`, `AppRadius.md` y `AppLayout.wideContentWidth`. Los ARB del backoffice no aparecen en el bundle inicial (`check_deferred_chunks`, que ya los vigila). Comando: `pnpm nx run-many -t format-check analyze test --projects=front-mf_backoffice`.
- Haiku 1: Sagas, SagaDetail y Overview. Haiku 2: Dlq, Tenants, TenantDetail y `BackofficePage`. El guía: manifiesto, ARB (I3 es la mayor concentración), fake y harness.

### 4.5 Oleada 3: cuatro microfrontends

**P3.1 billing y notifications.** Esfuerzo L.

- Carpetas: `microfrontends/billing/**`, `microfrontends/notifications/**`.
- Cierra: BI1, BI2, BI4, N1, N2, N3, I3 (billing), I4 (billing), AC7 (billing), M1 y M2 (uso), TU1 y TU2. BI3 se descarta.
- Produce: `BillingPlanController`, `InvoicesController`, `InvoiceDetailController`, `ChangePlanController` y `ChangePlanState`; `InboxController` (con `_requestId`, búfer de llegadas, reversión de solo `read`); `PreferencesController` (un guardado a la vez, gana el más reciente, con `ActionRunner(concurrency: ActionConcurrency.serial)`); `StatusChip` y `UsageMeter` con `StatusColors`; fakes con `DemoBehavior`. Retira: `billing_colors.dart`, `localeTag` propio, `SizedBox(height: 160, ...)` por `ConstrainedBox(minHeight:)`, `EdgeInsets.fromLTRB` por `EdgeInsetsDirectional.only`, `BorderRadius.circular(999)` por `AppRadius.full`.
- Aceptación: BI1 primero, como commit propio (borrar `billing_colors.dart`; prueba de contraste de chip y medidor en claro y oscuro con `textContrastGuideline`). `InboxController`: tocar "reintentar" dos veces no mezcla dos cargas; si llega una notificación en vivo mientras se guarda y el guardado falla, la notificación sigue en la lista y solo se revierte `read` (el bug de N1). `PreferencesController`: dos cambios seguidos dan dos guardados en orden; si el primero falla, el segundo cambio no se borra. `test/utils/test_app.dart` de billing desaparece a favor de `TestApp` y de `supportedLocales` de `i18n`. Comando: `pnpm nx run-many -t format-check analyze test --projects=front-mf_billing,front-mf_notifications`.
- Haiku 1: billing (BI1 primero, luego los cuatro controladores). Haiku 2: notifications (Inbox, Preferences, fake con `DemoBehavior`). El guía: manifiestos, ARB y harness de los dos.

**P3.2 tasks y verifier.** Esfuerzo M.

- Carpetas: `microfrontends/tasks/**`, `microfrontends/verifier/**`.
- Cierra: TK1 a TK5, V1, V2, V3, I3 (los que haya), M1 y M2 (uso), TU1 y TU2.
- Produce: `TaskFormController` y `TaskFormState`; `TaskDetailController` y `TaskDetailState`; `UuidV7Generator` con su archivo y su prueba; `TasksListController` con `selectedId` (TK3); `FakeTasksRepository` con `DemoBehavior` y `UuidV7Generator`; `VerifierController`, `VerifierState` y el tick inyectable; `verifier_widgets.dart` con la cuenta atrás en `Semantics` y el aviso solo a los 10 s y a 0 con `SemanticsService.sendAnnouncement`; `disableAnimations` en la barra. Retira: `builders.dart` y `_localized`, `loadNow`, `unavailableProblem`, `AppLayout` ya en `tokens` (reemplaza el `360`). Mueve `test/support.dart` de `tasks` y `verifier` a `test/utils/` o lo borra a favor de `TestApp`, y parte `tasks_screens_test.dart` (467 líneas) en `test/screens/<pantalla>_test.dart`.
- Aceptación: `VerifierController` con `FakeClock`: la cuenta atrás sale de `expiresAt` y no se desvía si el reloj salta 30 s; bloqueado, negado y reto nuevo reinician el estado sin un `_generation` visible; `copied` vuelve a `false` al pasar el reto. `TaskDetailController`: una respuesta vieja no pisa una nueva; un cambio externo durante el borrado no resucita la tarea. `TaskFormController`: `TaskFormSaved` es el único estado que navega. Los ids generados por `UuidV7Generator` son UUIDv7 válidos y ordenados con el reloj de prueba. Comando: `pnpm nx run-many -t format-check analyze test --projects=front-mf_tasks,front-mf_verifier`.
- Haiku 1: tasks. Haiku 2: verifier. El guía: manifiestos, binding y la partición de la prueba grande.

**P3.3 assistant.** Esfuerzo M.

- Carpetas: `microfrontends/assistant/**`.
- Cierra: AS1 a AS6, M1 y M2 (uso), TU1 y TU2.
- Produce: `AssistantAccess` en `shared/constants/assistant_access.dart` (AS1); `AssistantChatController` con `ChatState`, `AnswerState`, `ChatFailureKind`, `_requestId` en `load()` y `Object? takeError()` (AS2, AS3); `ChatBubble` en su archivo (un archivo, una clase); auto-desplazar solo si el usuario estaba al final (AS4); `labelText` en el campo, anuncio con `SemanticsService.sendAnnouncement` al terminar la respuesta y no por fragmento (AS5); `AppSpacing`, `AppLayout` o constantes propias en lugar de `sm + 4`, `md - 2`, `640` (AS5); pruebas con `Completer` por fragmento o `fakeAsync` en lugar de `Future.delayed` de 90 y 300 ms (AS6).
- Aceptación: `load()` doble no pisa; un `send` durante una carga no la sobrescribe; `isStreaming` sale del estado; la cuota excedida da `ChatFailureKind.quotaExceeded` y la pantalla solo lo mapea a texto; `grep -rn "Future<void>.delayed" microfrontends/assistant/test` vacío; `expectAccessible` pasa. Comando: `pnpm nx run-many -t format-check analyze test --projects=front-mf_assistant`.
- Haiku 1: controlador, estados y sus pruebas (con los `Completer`). Haiku 2: `ChatBubble`, la pantalla, `AssistantAccess`, el desplazamiento y la accesibilidad.

### 4.6 Oleada 4: apps, retiro y guía

**P4.1 apps y suite de escenarios.** Esfuerzo L.

- Carpetas: `apps/web/**`, `apps/mobile/**`, `packages/test_utils/**`.
- Cierra: AP1 (uso), AP2, AP3 (uso), TU1 (resto).
- Consume: `ShellMenuModel`, `IdentityConnectionFactory`, `ShellHost` (P2.1), `TestApp`, `FakeClock`, `FakeAuthRepository` (P1.3). Produce: la suite `defineShellScenarios` (3.16) y los dos `ShellFixture`; los scaffolds que solo pintan un `ShellMenuModel`; `webIdentityConnection` y `mobileIdentityConnection` como una llamada a `IdentityConnectionFactory`. Retira: `DeferredLibrariesLoader` (queda `DeferredLibrariesPreloader`) y `host.signOut()` sin `await` en una lambda (se envuelve con `unawaited`).
- Aceptación: `web_shell_test.dart` y `mobile_shell_test.dart` bajan de 1371 líneas a lo propio de cada plataforma (menú, "Más", `deep_link_mapper`); los 8 escenarios de la suite corren en las dos apps; la prueba de `/tasks2` pasa en móvil; `check-structure.mjs --changed .`; `flutter build web --release --source-maps` y `check_deferred_chunks`. Comando: `pnpm nx run-many -t format-check analyze test --projects=front-web_shell,front-mobile_shell,front-test_utils`.
- Haiku 1: la suite y el fixture de la web. Haiku 2: el fixture y el scaffold del móvil y `IdentityConnectionFactory` en las dos apps. El guía: scaffold web y revisión de que la suite cubre cada escenario que hoy tiene prueba (tabla escenario por escenario antes de borrar).

**P4.2 retiro de lo legado y script.** Esfuerzo M.

- Carpetas: `packages/shell_core/**`, `packages/shell_host/**`, `packages/ui/**`, `packages/auth/**`, `front/tools/**` salvo `new_microfrontend*`, `.claude/skills/front-estructura/scripts/**`.
- Cierra: cierre de SC2, SH1, SH2, M1, TL1 y el retiro de toda la lista de legado.
- Retira: `deferredPage`, `resetDeferredPageCache`, `buildShellRouter`, `homeLocation`, `signOutAndGoToLogin`, `redirectFor` y `shellScreenLoader`; los getters viejos de `MfaFlow` y el reexporte de `Clock` en `auth`; los dos usos antiguos de `ErrorView`/`AsyncValueView` que queden. La guía de partida es el compilador: se borra y se corrige hasta que `analyze` de todo el workspace queda limpio.
- Aceptación: `check-structure.mjs --all .` en verde con la línea base regenerada y vacía, y luego se borra `structure-baseline.json` (o queda como `[]` si el usuario prefiere conservar el mecanismo); `pnpm nx run-many -t format-check analyze test --projects=` con todos los proyectos del front en verde; `check_deferred_chunks`; `grep` de cada símbolo legado vacío.
- Haiku 1: retiro en `shell_core`, `shell_host` y `auth`. Haiku 2: la línea base, el script y la revisión de que ninguna de las reglas de 3.17 tiene una excepción olvidada.

**P4.3 skills, ADR y generador.** Esfuerzo M.

- Carpetas: `.claude/skills/front-*/**` (salvo `front-estructura/scripts/`), `.claude/skills/front-nuevo-microfrontend/**` (nueva), `front/tools/new_microfrontend.dart`, `docs/adr/0018-*.md`, `docs/adr/0024-*.md`, `docs/ARCHITECTURE.md`.
- Produce: las skills `front-codigo`, `front-pruebas`, `front-accesibilidad`, `front-layout-adaptable` y `front-i18n` actualizadas con `AsyncLoader`, `ActionRunner`, `ControllerBuilder`, `StatusColors`, `TestApp`, `expectAccessible`, `DeferredLocalizations` y `ScreenRoute.deferred`; el ADR 0018 con la nueva forma de declarar pantallas; el ADR 0024 en "Aceptada"; el generador:

  ```dart
  /// `dart run front/tools/new_microfrontend.dart reports --menu "Reportes"`
  final class MicrofrontendScaffolder {
    MicrofrontendScaffolder({required Directory frontRoot, required String id});

    /// Writes the package, adds it to `front/pubspec.yaml`, and returns the
    /// files it created plus the two lines to add to each app.
    ScaffoldResult create({required String menuLabelEs, required String menuLabelEn});
  }
  ```

- Aceptación: el generador crea `reports`, y `flutter pub get`, `analyze` y `test` de `front-mf_reports` salen verdes sin edición manual; `check-structure.mjs --all .` y `check_microfrontend_boundaries` pasan; después de crearlo se borra (es una prueba, no se versiona). Cada skill actualizada se revisa contra el código real.
- Haiku 1: el generador y su prueba. Haiku 2: skills y ADR.

## 5. Orden y tropas

Una tropa es un guía Sonnet y dos Haiku. Hay tres tropas por oleada como máximo, cada una en su copia del repositorio. Una oleada termina cuando sus tres paquetes están integrados y los comandos de aceptación del conjunto pasan; solo entonces empieza la siguiente.

| Oleada | Tropas               | Ruta crítica             | Esfuerzo total |
| ------ | -------------------- | ------------------------ | -------------- |
| 0      | 3 (P0.1, P0.2, P0.3) | P0.2                     | S + M + S      |
| 1      | 3 (P1.1, P1.2, P1.3) | P1.1 y P1.2 (L cada una) | L + L + M      |
| 2      | 3 (P2.1, P2.2, P2.3) | las tres son L           | L + L + L      |
| 3      | 3 (P3.1, P3.2, P3.3) | P3.1                     | L + M + M      |
| 4      | 3 (P4.1, P4.2, P4.3) | P4.1                     | L + M + M      |

Total: 15 paquetes en 5 oleadas. La oleada 4 puede arrancar P4.3 (docs y generador) apenas termine la 3. P4.1 y P4.2 no tocan los mismos archivos: P4.2 no edita `test_utils`, y P4.1 no edita los paquetes de P4.2.

Integración de una oleada: el guía de cada tropa entrega un diff acotado a su lista de carpetas. Un integrador (el usuario o un agente de revisión) junta los tres, corre `flutter pub get` y `pnpm nx run-many -t format-check analyze test --projects=<todo el front>` y `check_deferred_chunks`, antes de lanzar la siguiente oleada.

## 6. Riesgos y lo que se deja fuera

### 6.1 Riesgos

- **`guard` con `on Exception`.** Una prueba que lanza `StateError` como falla ahora ve escapar el error. Mitigación: cada guía busca `StateError(` en sus pruebas al empezar y lo cambia por una `Exception` tipada de prueba, definida una vez en `test_utils`.
- **Lo legado se queda.** Sin `@Deprecated` nadie ve el aviso. Mitigación: P4.2 es una tropa propia, se guía por el compilador y por el script, y la lista de legado de esta sección es su criterio de aceptación.
- **Barriles y `pubspec.yaml`.** Son el único punto donde dos tropas podrían chocar. Mitigación: solo los edita el guía y la lista de carpetas lo declara.
- **Un cambio visual por el mínimo de 48.** En escritorio, los botones pasan de 40 a 48 de alto. Mitigación: se decide antes (8.2); es un cambio en el tema, fácil de revertir.
- **Chunks diferidos.** Una clase nueva en el paquete equivocado puede subir código de un microfrontend al bundle inicial. Mitigación: `TasksData`, los controladores y las pantallas van en carpetas diferidas; `check_deferred_chunks` corre en cada paquete que toca manifiestos o pantallas.
- **Ciclo `test_utils` y `auth`.** Ya existe y funciona. Mitigación: se agrega `ui` como dependencia de `test_utils` solo si `nx graph` no marca un ciclo nuevo; si lo marca, `TestApp` recibe el `ThemeData` por parámetro.
- **Nombres parecidos.** `DeferredLibraryLoader` (shell_core) y `DeferredLibrariesLoader` (test_utils) se confunden. Por eso el segundo pasa a `DeferredLibrariesPreloader`.
- **Los Haiku siguen literal.** Una firma ambigua da código que compila y no hace lo pedido. Mitigación: el esqueleto con `UnimplementedError` y las pruebas nombradas en cada paquete; el guía revisa el diff contra las firmas de la sección 3.
- **ARB compartidos.** Solo P1.1 toca `i18n` en las oleadas 1 a 3. Si un microfrontend necesita una clave compartida nueva, la pide a P4.2.
- **Pruebas con tiempo real.** `Future.delayed` en las pruebas del asistente y retardos en los fakes. Mitigación: `DemoBehavior(delay: Duration.zero)` por defecto en pruebas y `FakeClock`.

### 6.2 Fuera de alcance

- **Endurecer `analysis_options.yaml`** (`strict-casts`, `unawaited_futures`, `public_member_api_docs`...): la skill `front-analisis` pide un cambio propio con todos los paquetes en verde, y no se sabe cuántos avisos aparecerán. Va después de este plan.
- **Golden tests:** la skill los marca opcionales. Se cubren con `expectAccessible`, `pumpAtWidths` y `pumpAtTextScale`.
- **Revisión manual con lector de pantalla** (TalkBack, VoiceOver, Tab en web): no se puede automatizar. Se anota por pantalla en cada paquete como pendiente del usuario.
- **TL2, TL3, A3:** ver 1.3.
- **`packages/contracts`, `packages/api` (salvo la lectura de tipos), `layout/*`, `tokens/lib/src/scales.dart`, cuerpo de `contracts_gen`:** el informe no los revisó y este plan no los toca. No equivale a "sin hallazgos".
- **Adaptadores reales de `tasks`, `notifications` y demás:** hoy son demo. Este plan no agrega datos reales.
- **Un catálogo único de versiones:** pub no lo permite. Se fija por archivo.

## 7. Crear un microfrontend nuevo después del cambio

Ejemplo: `reports`, con una lista y un detalle, datos de demostración y sin API real todavía.

1. Correr el generador: `dart run front/tools/new_microfrontend.dart reports --menu "Reportes"`. Crea el paquete con `pubspec.yaml`, `lib/mf_reports.dart`, las carpetas `data`, `screens`, `shared`, `l10n` y `test/utils`, y agrega el miembro a `front/pubspec.yaml`. Imprime las dos líneas que van en cada app.
2. Agregar el manifiesto a `apps/web/lib/main.dart` y a `apps/mobile/lib/main.dart` (1 línea en cada una).
3. Escribir lo propio del dominio.

Lo que se escribe a mano, con una estimación de líneas contra el código de hoy (tomando `tasks` y `notifications` como referencia):

| Pieza                                         | Hoy                                                 | Después                                                           |
| --------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| `mf_reports.dart` (id, acceso, menú, 2 rutas) | unas 80                                             | unas 35 (`ScreenRoute.deferred`, sin `_loading`)                  |
| Puente a las pantallas (`ReportsScreens`)     | unas 50 (`_localized`, `_repository`, 3 `build...`) | unas 14 (`DeferredLocalizations` y `scope.repository`)            |
| Binding del repositorio                       | unas 8 repetidas en cada `screens.dart`             | 6 (`ReportsData`)                                                 |
| Fake con latencia y fallos                    | unas 50 de plomería más los datos                   | unas 8 de plomería (`DemoBehavior`) más los datos                 |
| Un controlador de pantalla                    | 25 repartidas en el `State`                         | unas 30, con `AsyncLoader` y `ActionRunner`, probadas sin widgets |
| Harness de pruebas                            | 70 a 120 por microfrontend                          | 0 a 10 (`TestApp`, `SessionBuilder`, `ProblemFixtures`)           |
| Rutas, acceso y enums                         | unas 25                                             | unas 25 (no cambia: es dominio)                                   |
| ARB                                           | unas 20                                             | unas 20                                                           |

En total: unas 60 líneas de pegamento (manifiesto, puente y binding) que el generador ya deja escritas, contra unas 250 hoy entre pegamento repetido y plomería. Lo que queda por escribir es el dominio: el puerto del repositorio (unas 20 líneas), los datos de demostración, un controlador y una pantalla por ruta, los textos y las pruebas de cada controlador y de cada pantalla.

Esquema mínimo de las dos piezas de pegamento:

```dart
// lib/mf_reports.dart
final MicrofrontendManifest reportsManifest = MicrofrontendManifest(
  id: reportsId,
  platforms: {AppPlatform.web, AppPlatform.mobile},
  access: ReportsAccess.read,
  modes: const {ShellMode.demo},
  menu: const [MenuEntry(label: reportsMenuLabel, path: ReportsPaths.list, order: 30, icon: Icons.bar_chart_outlined, selectedIcon: Icons.bar_chart)],
  screens: [
    ScreenRoute.deferred(
      ReportsPaths.list,
      library: screens.loadLibrary,
      build: (scope, params) => screens.ReportsScreens().list(scope),
      routes: [
        ScreenRoute.deferred(
          ':${ReportsPaths.idParam}',
          library: screens.loadLibrary,
          build: (scope, params) => screens.ReportsScreens().detail(scope, params.require(ReportsPaths.idParam)),
        ),
      ],
    ),
  ],
);

// lib/src/screens/reports_screens.dart (deferred)
final class ReportsScreens {
  const ReportsScreens();

  Widget list(MicrofrontendScope scope) => DeferredLocalizations(
    delegates: const [ReportsLocalizations.delegate],
    child: ReportsListScreen(repository: scope.repository(ReportsData.repository)),
  );

  Widget detail(MicrofrontendScope scope, String id) => DeferredLocalizations(
    delegates: const [ReportsLocalizations.delegate],
    child: ReportDetailScreen(repository: scope.repository(ReportsData.repository), reportId: id),
  );
}
```

Checklist del microfrontend nuevo, que verifica el revisor:

- Ninguna pantalla tiene `State` con `Future`, `try/catch` ni `widget.repository.` (el script lo marca).
- Cada controlador usa `AsyncLoader` y `ActionRunner`, y su prueba no monta widgets.
- Cada pantalla tiene prueba de sus cuatro estados, un ancho compacto y uno expandido, `expectAccessible` y una a 2x de escala.
- Colores desde `Theme` y `context.statusColors`; textos desde el ARB con placeholders; `AlignmentDirectional` y `EdgeInsetsDirectional`.
- `check_microfrontend_boundaries` y `check_deferred_chunks` en verde.

## 8. Decisiones que necesitan visto bueno del usuario

1. **Versiones exactas por archivo (M3).** Pub no tiene un catálogo único. Propuesta: fijar el número exacto en cada `pubspec.yaml` y vigilarlo con el script. Alternativa: cambiar la skill `front-estructura` para aceptar `^`.
2. **Mínimo de 48 en todos los botones y campos (U4/U5).** La skill acepta 24 como piso en web con puntero. Propuesta: 48 en todo el tema, por uniformidad y por móvil. Costo: botones de 48 de alto también en escritorio.
3. **`i18n` depende de `contracts` (U6).** Propuesta: el mapeo de errores a texto vive en `i18n`, que ya tiene `errorMessage`, y `ui` deja de importar `contracts`. Alternativa: un paquete nuevo `errors`, más limpio pero un miembro más del workspace.
4. **`ControllerBuilder` en `ui`.** Propuesta: un widget que crea y cierra el controlador, para que las 27 pantallas sean `StatelessWidget`. Alternativa: dejar un `State` mínimo por pantalla que solo hace `initState` y `dispose`.
5. **`ActionResult` con tres desenlaces y `ActionConcurrency`.** El informe propone dos (`ActionSucceeded`, `ActionFailed`). Propuesta: sumar `ActionSkipped` (step-up rechazado, acción ya en curso) y tres modos de concurrencia, porque `PreferencesController` necesita serializar y `closeOthers` necesita distinguir "no corrió" de "falló".
6. **Lo legado se retira al final, sin `@Deprecated` (2.2).** Propuesta: comentario `Legacy` y una oleada propia de retiro. Costo: la API vieja y la nueva conviven hasta la oleada 4.
7. **La suite de escenarios vive en `test_utils` y no en `shell_host/test` (3.16).** Es la única ubicación que dos apps pueden importar.
8. **Los diálogos de `backoffice` se arreglan con `showLocalizedDialog` y no con `useRootNavigator: false` (B5).** La propuesta del informe no funciona.
9. **Línea base para las reglas nuevas del script (3.17).** Propuesta: las reglas entran ya, con una línea base que se vacía en la oleada 4. Alternativa: entrar al final, pero entonces nada protege el código que las oleadas 1 a 3 escriben.
10. **`StepUpGate` en `account` y no en `shell_core` (3.11).** Solo account lo usa hoy.
11. **Fuera de alcance:** endurecer `analysis_options.yaml` como cambio aparte (6.2).
