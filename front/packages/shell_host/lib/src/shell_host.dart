import 'dart:async';

import 'package:api/api.dart';
import 'package:auth/auth.dart';
import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'demo_profiles.dart';
import 'pages/forbidden_page.dart';
import 'pages/login_page.dart';
import 'pages/step_up_page.dart';
import 'return_location.dart';
import 'screen_loader.dart';

/// Draws the frame of a shell around a microfrontend page at [location]:
/// navigation, sign-out and badges. Each shell brings its own.
typedef ShellScaffoldBuilder = Widget Function(
  BuildContext context,
  ShellHost host,
  String location,
  Widget child,
);

/// Everything a shell owns besides its frame: registry, session, runtime,
/// router, step-up and menu badges, wired the same way on web and mobile.
///
/// The mode is decided once, here: with a [connection] the shell is
/// [ShellMode.live] (the session follows identity and the microfrontends get
/// the connection's `ApiClient`); without one it is [ShellMode.demo] (demo
/// sessions and in-memory repositories). A manifest that does not serve the
/// mode is not registered.
///
/// Create one per app run and call [dispose] when the app goes away;
/// [ShellHostApp] does both.
final class ShellHost {
  ShellHost({
    required this.platform,
    required List<MicrofrontendManifest> manifests,
    required ShellScaffoldBuilder scaffold,
    this.connection,
    this.demoProfiles = DemoProfile.values,
    DateTime Function() clock = DateTime.now,
    ScreenLoader load = shellScreenLoader,
  }) : registry = MicrofrontendRegistry() {
    for (final manifest in manifests) {
      if (manifest.modes.contains(mode)) registry.register(manifest);
    }
    final api = connection?.apiClient;
    runtime = ShellRuntime(
      registry: registry,
      platform: platform,
      session: session,
      clock: clock,
      servicesFactory: (identity) => ShellServices(
        session: identity,
        mode: mode,
        api: api,
        onSignOut: signOut,
        onStepUp: requestStepUp,
      ),
    );
    router = buildShellRouter(
      registry: registry,
      platform: platform,
      runtime: runtime,
      routes: _shellRoutes(),
      load: load,
      paths: paths,
      shellBuilder: (context, state, child) =>
          scaffold(context, this, state.uri.path, child),
    );
    stepUp.attach(router);
    _watchBadges();
    connection?.access.addListener(_onAccessChanged);
    runtime.identityEpoch.addListener(_onIdentityChanged);
  }

  /// Pages of the shell itself.
  static const ShellPaths paths = ShellPaths(stepUp: '/step-up');

  /// Platform the shell runs on.
  final AppPlatform platform;

  /// Real identity connection, or null in demo mode. The host disposes it.
  final IdentityConnection? connection;

  /// Profiles offered by the demo sign-in.
  final List<DemoProfile> demoProfiles;

  /// Manifests registered for [mode].
  final MicrofrontendRegistry registry;

  /// Current user. Anonymous until a sign-in, and again after a sign-out.
  final ValueNotifier<UserSession> session = ValueNotifier(
    UserSession.anonymous(),
  );

  late final ShellRuntime runtime;
  late final GoRouter router;

  /// Step-up requests of the microfrontends.
  final StepUpRequests stepUp = StepUpRequests(path: paths.stepUp!);

  /// Messenger of the app; its snack bars are cleared when the identity
  /// changes.
  final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey =
      GlobalKey<ScaffoldMessengerState>();

  /// Count of each menu entry with a badge, by entry path. Empty for a new
  /// identity until its microfrontends publish again.
  ValueListenable<Map<String, int>> get badges => _badges;
  final ValueNotifier<Map<String, int>> _badges = ValueNotifier(const {});
  final List<StreamSubscription<int>> _badgeSubscriptions = [];

  /// Where the data comes from, fixed for the whole run.
  ShellMode get mode => connection == null ? ShellMode.demo : ShellMode.live;

  /// Menu the current session can reach on [platform].
  List<MenuEntry> get menu => registry.menuFor(session.value, platform);

  /// Count to draw on [entry], or null for none.
  int? badgeFor(MenuEntry entry) =>
      entry.badge == null ? null : (_badges.value[entry.path] ?? 0);

  /// Opens the step-up page on top of the current one and completes with
  /// whether the user verified the second factor.
  ///
  /// Behind `ShellServices.requestStepUp`. The page updates
  /// `UserSession.mfaVerifiedAt` and pops with the result, so the screen that
  /// asked stays mounted. If the page goes away without an answer (a `go`, a
  /// redirect or an identity change) it completes with false.
  Future<bool> requestStepUp() => stepUp.request();

  /// Ends the session (in identity too, with a connection) and goes to the
  /// login page without `from`.
  Future<void> signOut() async {
    try {
      await connection?.signOut();
    } finally {
      await signOutAndGoToLogin(
        router: router,
        session: session,
        loginPath: paths.login,
      );
    }
  }

  /// Starts the lifecycles of the visible microfrontends. With a connection
  /// it also tries to recover the session and, if it opens, leaves the login
  /// page for the location the user asked for.
  ///
  /// Without network the user stays on the sign-in page. Any other failure
  /// is reported too, because it is not something the user can fix.
  Future<void> start() async {
    await runtime.start();
    final connection = this.connection;
    if (connection == null) return;
    try {
      if (!await connection.restore()) return;
    } on TransportException {
      return;
    } catch (error, stack) {
      FlutterError.reportError(
        FlutterErrorDetails(
          exception: error,
          stack: stack,
          library: 'shell_host',
          context: ErrorDescription('while restoring the session'),
        ),
      );
      return;
    }
    final location = router.routerDelegate.currentConfiguration.uri;
    if (location.path == paths.login) {
      router.go(safeReturnLocation(location.queryParameters['from']));
    }
  }

  Future<void> dispose() async {
    connection?.access.removeListener(_onAccessChanged);
    runtime.identityEpoch.removeListener(_onIdentityChanged);
    stepUp.dispose();
    for (final subscription in _badgeSubscriptions) {
      await subscription.cancel();
    }
    router.dispose();
    await runtime.dispose();
    _badges.dispose();
    session.dispose();
    await connection?.dispose();
  }

  void _watchBadges() {
    for (final manifest in registry.manifests) {
      for (final entry in manifest.menu) {
        final badge = entry.badge;
        if (badge == null) continue;
        _badgeSubscriptions.add(
          badge.watch(runtime.eventBus).listen((count) {
            _badges.value = {..._badges.value, entry.path: count};
          }),
        );
      }
    }
  }

  /// The session follows the access of the real connection. When identity
  /// closes the session (revoked, expired) the user goes back to sign-in.
  void _onAccessChanged() {
    final access = connection?.access.value;
    if (access != null) {
      session.value = UserSession.fromAccess(access);
    } else if (session.value.isAuthenticated) {
      unawaited(
        signOutAndGoToLogin(
          router: router,
          session: session,
          loginPath: paths.login,
        ),
      );
    }
  }

  /// A new identity must not see the previous user's badges or messages, nor
  /// keep waiting for the previous user's step-up.
  void _onIdentityChanged() {
    stepUp.cancel();
    _badges.value = const {};
    scaffoldMessengerKey.currentState?.clearSnackBars();
  }

  List<RouteBase> _shellRoutes() => [
    GoRoute(path: '/', redirect: (context, state) => _homePath()),
    GoRoute(
      path: paths.login,
      builder: (context, state) => LoginPage(
        session: session,
        demoProfiles: demoProfiles,
        from: state.uri.queryParameters['from'],
        connection: connection,
      ),
    ),
    GoRoute(
      path: paths.forbidden,
      builder: (context, state) => ForbiddenPage(onSignOut: signOut),
    ),
    GoRoute(
      path: paths.stepUp!,
      redirect: (context, state) =>
          session.value.isAuthenticated ? null : paths.login,
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
      homeLocation(registry, session.value, platform) ??
      (session.value.isAuthenticated ? paths.forbidden : paths.login);
}
