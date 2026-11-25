import 'dart:async';

import 'package:api/api.dart';
import 'package:auth/auth.dart';
import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart';

import 'demo_profiles.dart';
import 'menu_badges.dart';
import 'return_location.dart';
import 'session_binding.dart';
import 'shell_load_error.dart';
import 'shell_routes.dart';

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
/// The mode is decided once, in the unnamed factory: with a [connection] the
/// shell is [ShellMode.live] (the session follows identity and the
/// microfrontends get the connection's `ApiClient`); without one it is
/// [ShellMode.demo] (demo sessions and in-memory repositories). A manifest
/// that does not serve the mode is not registered.
///
/// Create one per app run and call [dispose] when the app goes away;
/// [ShellHostApp] does both.
final class ShellHost {
  /// Composition from ready pieces. Tests of one piece use this; it starts
  /// following [binding] and the identity.
  ShellHost.compose({
    required this.platform,
    required this.registry,
    required this.session,
    required this.runtime,
    required this.router,
    required this.navigator,
    required this.menuBadges,
    required this.stepUp,
    required this.scaffoldMessengerKey,
    this.binding,
    this.connection,
  }) {
    binding?.start();
    runtime.identityEpoch.addListener(_onIdentityChanged);
  }

  /// Builds every piece in the order they need each other: the registry and
  /// session first, then the navigator and step-up requests, then the runtime
  /// (its services need sign-out and step-up, which reach the host through
  /// [host] once it exists), then the routes and the router, and last the
  /// pieces that need the router.
  factory ShellHost({
    required AppPlatform platform,
    required List<MicrofrontendManifest> manifests,
    required ShellScaffoldBuilder scaffold,
    IdentityConnection? connection,
    List<DemoProfile> demoProfiles = DemoProfile.values,
    Clock clock = systemClock,
    DeferredLibraryLoader? loader,
  }) {
    final mode = connection == null ? ShellMode.demo : ShellMode.live;
    final registry = MicrofrontendRegistry();
    for (final manifest in manifests) {
      if (manifest.modes.contains(mode)) registry.register(manifest);
    }
    final session = ValueNotifier(UserSession.anonymous());
    final navigator = ShellNavigator(
      registry: registry,
      session: session,
      platform: platform,
      paths: paths,
      clock: clock,
    );
    final stepUp = StepUpRequests(path: paths.stepUp!);
    // Read only after the host exists: the callbacks run on user actions.
    late final ShellHost host;
    final api = connection?.apiClient;
    final runtime = ShellRuntime(
      registry: registry,
      platform: platform,
      session: session,
      clock: clock,
      servicesFactory: (identity) => ShellServices(
        session: identity,
        mode: mode,
        api: api,
        onSignOut: () => host.signOut(),
        onStepUp: () => host.requestStepUp(),
      ),
    );
    final routes = ShellRoutes(
      paths: paths,
      session: session,
      navigator: navigator,
      stepUp: stepUp,
      onSignOut: () => host.signOut(),
      demoProfiles: demoProfiles,
      clock: clock,
      connection: connection,
    );
    final router =
        ShellRouterFactory(
          registry: registry,
          platform: platform,
          runtime: runtime,
          loader:
              loader ??
              DeferredLibraryLoader(
                loading: const LoadingView(),
                errorBuilder: ShellLoadError.builder,
              ),
          paths: paths,
          clock: clock,
        ).build(
          routes: routes.build(),
          shellBuilder: (context, state, child) =>
              scaffold(context, host, state.uri.path, child),
        );
    navigator.attach(router);
    stepUp.attach(router);
    host = ShellHost.compose(
      platform: platform,
      registry: registry,
      session: session,
      runtime: runtime,
      router: router,
      navigator: navigator,
      menuBadges: MenuBadges(registry: registry, bus: runtime.eventBus),
      stepUp: stepUp,
      scaffoldMessengerKey: GlobalKey<ScaffoldMessengerState>(),
      binding: connection == null
          ? null
          : SessionBinding(
              connection: connection,
              session: session,
              navigator: navigator,
            ),
      connection: connection,
    );
    return host;
  }

  /// Pages of the shell itself.
  static const ShellPaths paths = ShellPaths(stepUp: '/step-up');

  /// Platform the shell runs on.
  final AppPlatform platform;

  /// Real identity connection, or null in demo mode. The host disposes it.
  final IdentityConnection? connection;

  /// Manifests registered for [mode].
  final MicrofrontendRegistry registry;

  /// Current user. Anonymous until a sign-in, and again after a sign-out.
  final ValueNotifier<UserSession> session;

  final ShellRuntime runtime;
  final GoRouter router;

  /// Where the shell sends the user: home, landing and sign-out.
  final ShellNavigator navigator;

  /// Step-up requests of the microfrontends.
  final StepUpRequests stepUp;

  /// Messenger of the app; its snack bars are cleared when the identity
  /// changes.
  final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey;

  /// Count of each menu entry with a badge.
  final MenuBadges menuBadges;

  /// Follows the access of [connection], or null in demo mode.
  final SessionBinding? binding;

  /// Count of each menu entry with a badge, by entry path. Empty for a new
  /// identity until its microfrontends publish again.
  ValueListenable<Map<String, int>> get badges => menuBadges.counts;

  /// Where the data comes from, fixed for the whole run.
  ShellMode get mode => connection == null ? ShellMode.demo : ShellMode.live;

  /// Menu the current session can reach on [platform].
  List<MenuEntry> get menu =>
      registry.menuFor(session.value, platform, now: runtime.clock());

  /// Count to draw on [entry], or null for none.
  int? badgeFor(MenuEntry entry) => menuBadges.countFor(entry);

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
      await navigator.signOutAndGoToLogin();
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
      // catch-all: any other restore failure is reported and the user stays on sign-in
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

  /// Completes once [dispose] has released everything: the runtime with the
  /// scopes of every identity, the router and the connection.
  Future<void> get whenDisposed => _disposed.future;
  final Completer<void> _disposed = Completer<void>();

  Future<void> dispose() async {
    binding?.stop();
    runtime.identityEpoch.removeListener(_onIdentityChanged);
    stepUp.dispose();
    // The badges stop listening before the bus closes, or its close waits.
    await menuBadges.dispose();
    router.dispose();
    await runtime.dispose();
    session.dispose();
    await connection?.dispose();
    _disposed.complete();
  }

  /// A new identity must not see the previous user's badges or messages, nor
  /// keep waiting for the previous user's step-up.
  void _onIdentityChanged() {
    stepUp.cancel();
    menuBadges.reset();
    scaffoldMessengerKey.currentState?.clearSnackBars();
  }
}
