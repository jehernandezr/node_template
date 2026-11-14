import 'dart:async';

import 'package:api/api.dart';
import 'package:auth/auth.dart';
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
///
/// With a [connection] (the app runs with `API_BASE_URL`) the session comes
/// from identity: [session] follows `GET /v1/me/access` and the microfrontends
/// get the connection's `ApiClient` in their services. Without one the shell
/// runs on demo sessions and the microfrontends on their fakes.
final class WebShell {
  WebShell({MicrofrontendRegistry? registry, this.connection})
    : registry = registry ?? buildWebRegistry() {
    final apiClient = connection?.apiClient;
    runtime = ShellRuntime(
      registry: this.registry,
      platform: AppPlatform.web,
      session: session,
      servicesFactory: (identity) => DefaultShellServices(
        session: identity,
        onSignOut: signOut,
        onStepUp: requestStepUp,
        extras: {ApiClient: ?apiClient},
      ),
    );
    connection?.access.addListener(_onAccessChanged);
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
    stepUp.attach(router);
  }

  /// Path of the page that asks for a recent second factor.
  static const String stepUpPath = '/step-up';

  final MicrofrontendRegistry registry;

  /// Real identity connection, or null in demo mode.
  final IdentityConnection? connection;

  /// Step-up requests of the microfrontends.
  final StepUpRequests stepUp = StepUpRequests(path: stepUpPath);

  /// Current user. Anonymous until a sign-in, and again after a sign-out.
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

  /// Opens the step-up page on top of the current one and completes with
  /// whether the user verified the second factor.
  ///
  /// Microfrontends call it through `ShellServices.requestStepUp` before a
  /// sensitive action. The page updates `UserSession.mfaVerifiedAt` and pops
  /// with the result, so the screen that asked stays mounted. If the page goes
  /// away without an answer (a `go`, a redirect or an identity change) it
  /// completes with false.
  Future<bool> requestStepUp() => stepUp.request();

  /// Ends the session (in identity too, with a connection) and goes to
  /// `/login` without `from`.
  Future<void> signOut() async {
    try {
      await connection?.signOut();
    } finally {
      await signOutAndGoToLogin(router: router, session: session);
    }
  }

  /// Starts following the session and the lifecycles of the visible
  /// microfrontends. With a connection it also tries to recover the session
  /// (on the web the cookie travels by itself) and, if it opens, leaves the
  /// login page for the location the user asked for.
  Future<void> start() async {
    await runtime.start();
    final connection = this.connection;
    if (connection == null) return;
    try {
      if (!await connection.restore()) return;
    } catch (_) {
      // Network failures leave the user on the sign-in page.
      return;
    }
    final location = router.routerDelegate.currentConfiguration.uri;
    if (location.path == '/login') {
      router.go(LoginPage.safeDestination(location.queryParameters['from']));
    }
  }

  Future<void> dispose() async {
    connection?.access.removeListener(_onAccessChanged);
    stepUp.dispose();
    session.removeListener(_onSessionChanged);
    runtime.identityEpoch.removeListener(_onIdentityChanged);
    await _unreadSubscription.cancel();
    router.dispose();
    await runtime.dispose();
    unreadCount.dispose();
    session.dispose();
    await connection?.dispose();
  }

  /// The session follows the access of the real connection. When identity
  /// closes the session (revoked, expired) the user goes back to sign-in.
  void _onAccessChanged() {
    final access = connection?.access.value;
    if (access != null) {
      session.value = UserSession.fromAccess(access);
    } else if (session.value.isAuthenticated) {
      unawaited(signOutAndGoToLogin(router: router, session: session));
    }
  }

  void _onSessionChanged() {
    if (!session.value.isAuthenticated) unreadCount.value = 0;
  }

  /// A message about the previous user's action must not stay on screen.
  void _onIdentityChanged() {
    stepUp.cancel();
    unreadCount.value = 0;
    scaffoldMessengerKey.currentState?.clearSnackBars();
  }

  /// Shell pages. The microfrontend routes are added by [buildShellRouter].
  List<RouteBase> _shellRoutes() => [
    GoRoute(path: '/', redirect: (context, state) => _homePath()),
    GoRoute(
      path: '/login',
      builder: (context, state) => LoginPage(
        session: session,
        from: state.uri.queryParameters['from'],
        connection: connection,
      ),
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
        onResult: stepUp.isRequest(state.extra) ? stepUp.complete : null,
        connection: connection,
      ),
    ),
  ];

  /// First visible menu entry; otherwise login for anonymous, forbidden for
  /// a signed-in user with nothing to show.
  String _homePath() =>
      homeLocation(registry, session.value, AppPlatform.web) ??
      (session.value.isAuthenticated ? '/forbidden' : '/login');
}
