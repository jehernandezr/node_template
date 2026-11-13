import 'dart:async';

import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_account/mf_account.dart' show accountManifest;
import 'package:mf_assistant/mf_assistant.dart' show assistantManifest;
import 'package:mf_backoffice/mf_backoffice.dart' show backofficeManifest;
import 'package:mf_billing/mf_billing.dart' show billingManifest;
import 'package:mf_notifications/mf_notifications.dart'
    show notificationsManifest;
import 'package:mf_tasks/mf_tasks.dart' show tasksManifest;
import 'package:shell_core/shell_core.dart';

import 'pages/forbidden_page.dart';
import 'pages/login_page.dart';
import 'pages/step_up_page.dart';
import 'pages/web_shell_scaffold.dart';
import 'screen_loader.dart';

/// Microfrontends the web shell composes, in registration order.
MicrofrontendRegistry buildWebRegistry() => MicrofrontendRegistry()
  ..register(accountManifest)
  ..register(tasksManifest)
  ..register(notificationsManifest)
  ..register(assistantManifest)
  ..register(billingManifest)
  ..register(backofficeManifest);

/// Everything the web shell owns: registry, session, runtime and router.
///
/// Create one per app run. Call [dispose] when the app goes away. Tests may
/// pass their own [registry].
final class WebShell {
  WebShell({MicrofrontendRegistry? registry})
    : registry = registry ?? buildWebRegistry() {
    runtime = ShellRuntime(
      registry: this.registry,
      platform: AppPlatform.web,
      session: session,
      servicesFactory: (identity) => DefaultShellServices(
        session: identity,
        eventBus: runtime.eventBus,
        onSignOut: signOut,
      ),
    );
    session.addListener(_onSessionChanged);
    runtime.identityEpoch.addListener(_onIdentityChanged);
    _unreadSubscription = runtime.eventBus
        .on<UnreadCountChanged>(replay: true)
        .listen((event) => unreadCount.value = event.count);
    router = buildShellRouter(
      registry: this.registry,
      platform: AppPlatform.web,
      runtime: runtime,
      routes: _shellRoutes(),
      load: loadScreen,
      stepUpPath: stepUpPath,
      shellBuilder: (context, state, child) =>
          WebShellScaffold(shell: this, location: state.uri.path, child: child),
    );
  }

  /// Path of the page that asks for a recent second factor.
  static const String stepUpPath = '/step-up';

  final MicrofrontendRegistry registry;

  /// Current user. Anonymous until a demo sign-in or sign-out.
  final ValueNotifier<UserSession> session = ValueNotifier(
    UserSession.anonymous(),
  );

  /// Unread notifications, fed by `UnreadCountChanged` events.
  final ValueNotifier<int> unreadCount = ValueNotifier(0);

  late final ShellRuntime runtime;
  late final GoRouter router;

  /// Messenger of the app; its snack bars are cleared when the identity changes.
  final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey =
      GlobalKey<ScaffoldMessengerState>();
  late final StreamSubscription<UnreadCountChanged> _unreadSubscription;

  /// Ends the session and goes to `/login` without `from`.
  Future<void> signOut() =>
      signOutAndGoToLogin(router: router, session: session);

  /// Starts following the session and the lifecycles of the visible microfrontends.
  Future<void> start() => runtime.start();

  Future<void> dispose() async {
    session.removeListener(_onSessionChanged);
    runtime.identityEpoch.removeListener(_onIdentityChanged);
    await _unreadSubscription.cancel();
    router.dispose();
    await runtime.dispose();
    unreadCount.dispose();
    session.dispose();
  }

  void _onSessionChanged() {
    if (!session.value.isAuthenticated) unreadCount.value = 0;
  }

  /// A message about the previous user's action must not stay on screen.
  void _onIdentityChanged() {
    unreadCount.value = 0;
    scaffoldMessengerKey.currentState?.clearSnackBars();
  }

  /// Shell pages. The microfrontend routes are added by [buildShellRouter].
  List<RouteBase> _shellRoutes() => [
    GoRoute(path: '/', redirect: (context, state) => _homePath()),
    GoRoute(
      path: '/login',
      builder: (context, state) =>
          LoginPage(session: session, from: state.uri.queryParameters['from']),
    ),
    GoRoute(
      path: '/forbidden',
      builder: (context, state) => ForbiddenPage(onSignOut: signOut),
    ),
    GoRoute(
      path: stepUpPath,
      redirect: (context, state) =>
          session.value.isAuthenticated ? null : '/login',
      builder: (context, state) => StepUpPage(
        session: session,
        from: state.uri.queryParameters['from'],
        clock: runtime.clock,
      ),
    ),
  ];

  /// First visible menu entry; otherwise login for anonymous, forbidden for
  /// a signed-in user with nothing to show.
  String _homePath() =>
      homeLocation(registry, session.value, AppPlatform.web) ??
      (session.value.isAuthenticated ? '/forbidden' : '/login');
}
