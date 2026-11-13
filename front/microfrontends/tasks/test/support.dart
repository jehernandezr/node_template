import 'package:contracts/contracts.dart';
import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_tasks/mf_tasks.dart';
import 'package:mf_tasks/src/data/tasks_repository.dart';
import 'package:shell_core/shell_core.dart';

/// Loader for tests: calls the manifest's own `loadLibrary` each time a screen
/// is built, then shows it. Unlike shell_core's `deferredPage`, it does not
/// cache the load across tests.
Widget loadNow({
  required Future<void> Function() loadLibrary,
  required Widget Function() builder,
  Widget? loading,
  Widget Function(Object error, VoidCallback retry)? errorBuilder,
}) => _Loaded(loadLibrary: loadLibrary, builder: builder, loading: loading);

final class _Loaded extends StatefulWidget {
  const _Loaded({
    required this.loadLibrary,
    required this.builder,
    this.loading,
  });

  final Future<void> Function() loadLibrary;
  final Widget Function() builder;
  final Widget? loading;

  @override
  State<_Loaded> createState() => _LoadedState();
}

class _LoadedState extends State<_Loaded> {
  late final Future<void> _library = widget.loadLibrary();

  @override
  Widget build(BuildContext context) => FutureBuilder<void>(
    future: _library,
    builder: (context, snapshot) =>
        snapshot.connectionState == ConnectionState.done
        ? widget.builder()
        : widget.loading ?? const SizedBox.shrink(),
  );
}

/// Scope of one identity. Each call is a new identity with no objects yet.
MicrofrontendScope newScope({String userId = 'user-1'}) => MicrofrontendScope(
  DefaultShellServices(
    session: UserSession(userId: userId, tenantId: 'tenant-1'),
    eventBus: ShellEventBus(),
  ),
);

/// Scope whose tasks repository is [repository].
MicrofrontendScope scopeWith(TasksRepository repository) {
  final scope = newScope();
  scope.get<TasksRepository>((services) => repository);
  return scope;
}

/// Permissions of a user who can read and write tasks.
const Set<Permission> readWrite = {Permission.tasksRead, Permission.tasksWrite};

/// Permissions of a user who can only read tasks.
const Set<Permission> readOnly = {Permission.tasksRead};

/// Text of the stand-in for the shell's forbidden page.
const String forbiddenText = 'forbidden-page';

/// App that runs the real manifest routes, starting at [location], for a
/// session holding [permissions]. Rejected requests land on a forbidden page.
Widget tasksApp({
  required MicrofrontendScope scope,
  String location = '/tasks',
  Locale locale = const Locale('es'),
  Set<Permission> permissions = readWrite,
}) {
  final session = ValueNotifier(
    UserSession(
      userId: 'user-1',
      tenantId: 'tenant-1',
      permissions: permissions,
    ),
  );
  final router = GoRouter(
    initialLocation: location,
    routes: [
      ...tasksManifest.buildRoutes(loadNow, () => scope),
      GoRoute(
        path: '/forbidden',
        builder: (context, state) => const Text(forbiddenText),
      ),
    ],
  );
  return ShellAccessScope(
    session: session,
    child: MaterialApp.router(
      routerConfig: router,
      locale: locale,
      supportedLocales: supportedLocales,
      localizationsDelegates: [
        AppLocalizations.delegate,
        ...GlobalMaterialLocalizations.delegates,
      ],
    ),
  );
}

/// Problem returned by a fake repository in error tests.
const ProblemDetails unavailableProblem = ProblemDetails(
  type: 'about:blank',
  title: 'Service unavailable',
  status: 503,
  code: 'PLATFORM.INTERNAL.UNEXPECTED',
  traceId: 'trace-123',
);
