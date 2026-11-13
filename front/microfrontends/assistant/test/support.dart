import 'package:contracts/contracts.dart';
import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_assistant/mf_assistant.dart';
import 'package:mf_assistant/src/data/assistant_repository.dart';
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

/// Session that can use the assistant and create tasks.
UserSession writerSession({String userId = 'user-1'}) => UserSession(
  userId: userId,
  tenantId: 'tenant-1',
  permissions: {Permission.tasksWrite},
  planFeatures: {PlanFeature.aiAssistant},
);

/// Session that can use the assistant but not create tasks.
UserSession readerSession() => UserSession(
  userId: 'user-2',
  tenantId: 'tenant-1',
  planFeatures: {PlanFeature.aiAssistant},
);

/// Scope of one identity. Each call is a new identity with no objects yet.
MicrofrontendScope newScope({UserSession? session}) => MicrofrontendScope(
  DefaultShellServices(
    session: session ?? writerSession(),
    eventBus: ShellEventBus(),
  ),
);

/// Scope whose assistant repository is [repository].
MicrofrontendScope scopeWith(
  AssistantRepository repository, {
  UserSession? session,
}) {
  final scope = newScope(session: session);
  scope.get<AssistantRepository>((services) => repository);
  return scope;
}

/// App that runs the real manifest routes, starting at [location].
Widget assistantApp({
  required MicrofrontendScope scope,
  String location = '/assistant',
  Locale locale = const Locale('es'),
  UserSession? session,
}) {
  final router = GoRouter(
    initialLocation: location,
    routes: assistantManifest.buildRoutes(loadNow, () => scope),
  );
  final notifier = ValueNotifier<UserSession>(
    session ?? scope.services.session,
  );
  return MaterialApp.router(
    routerConfig: router,
    locale: locale,
    supportedLocales: supportedLocales,
    localizationsDelegates: [
      AppLocalizations.delegate,
      ...GlobalMaterialLocalizations.delegates,
    ],
    builder: (context, child) =>
        ShellAccessScope(session: notifier, child: child!),
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
