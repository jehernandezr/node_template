import 'dart:async';

import 'package:api/api.dart';
import 'package:auth/auth.dart';
import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import 'login/login_page.dart';
import 'router.dart';

/// Root widget of the mobile shell. Owns the [ShellRuntime] and the router.
class MobileShellApp extends StatefulWidget {
  /// Creates the shell for [registry], following [session].
  ///
  /// With a [connection] (the app runs with `API_BASE_URL`) the session comes
  /// from identity: [session] follows `GET /v1/me/access` and the
  /// microfrontends get the connection's `ApiClient` in their services.
  /// Without one the shell runs on demo sessions and fakes.
  const MobileShellApp({
    super.key,
    required this.registry,
    required this.session,
    this.connection,
  });

  /// Microfrontends composed by this shell.
  final MicrofrontendRegistry registry;

  /// Session source; sign-in and sign-out write to it.
  final ValueNotifier<UserSession> session;

  /// Real identity connection, or null in demo mode. The app disposes it.
  final IdentityConnection? connection;

  @override
  State<MobileShellApp> createState() => _MobileShellAppState();
}

class _MobileShellAppState extends State<MobileShellApp> {
  late final ShellRuntime _runtime;
  final DeviceKeyPort _deviceKeys = FakeDeviceKeyPort();
  final StepUpRequests _stepUp = StepUpRequests(path: stepUpPath);
  // Assigned after the runtime; sign-out only runs once the app is up.
  late final GoRouter _router;
  late final StreamSubscription<UnreadCountChanged> _unreadSubscription;
  final ValueNotifier<int> _unreadCount = ValueNotifier<int>(0);
  final GlobalKey<ScaffoldMessengerState> _messengerKey =
      GlobalKey<ScaffoldMessengerState>();

  @override
  void initState() {
    super.initState();
    final apiClient = widget.connection?.apiClient;
    _runtime = ShellRuntime(
      registry: widget.registry,
      platform: AppPlatform.mobile,
      session: widget.session,
      servicesFactory: (identity) => DefaultShellServices(
        session: identity,
        onSignOut: _signOut,
        onStepUp: _requestStepUp,
        // Demo: the real Secure Enclave / Keystore adapter replaces this fake.
        extras: {DeviceKeyPort: _deviceKeys, ApiClient: ?apiClient},
      ),
    );
    _unreadSubscription = _runtime.eventBus
        .on<UnreadCountChanged>(replay: true)
        .listen((event) => _unreadCount.value = event.count);
    _router = buildMobileRouter(
      registry: widget.registry,
      runtime: _runtime,
      session: widget.session,
      unreadCount: _unreadCount,
      onSignOut: _signOut,
      stepUp: _stepUp,
      connection: widget.connection,
    );
    _stepUp.attach(_router);
    _runtime.identityEpoch.addListener(_onIdentityChanged);
    widget.connection?.access.addListener(_onAccessChanged);
    unawaited(_start());
  }

  /// Starts the runtime and, with a connection, tries to recover the session.
  /// If it opens, the app leaves the login page for the requested location.
  Future<void> _start() async {
    await _runtime.start();
    final connection = widget.connection;
    if (connection == null) return;
    try {
      if (!await connection.restore()) return;
    } catch (_) {
      // Network failures leave the user on the sign-in page.
      return;
    }
    if (!mounted) return;
    final location = _router.routerDelegate.currentConfiguration.uri;
    if (location.path == '/login') {
      _router.go(safeReturnLocation(location.queryParameters['from']));
    }
  }

  @override
  void dispose() {
    widget.connection?.access.removeListener(_onAccessChanged);
    _stepUp.dispose();
    _runtime.identityEpoch.removeListener(_onIdentityChanged);
    _unreadSubscription.cancel();
    _router.dispose();
    _runtime.dispose();
    _unreadCount.dispose();
    widget.connection?.dispose();
    super.dispose();
  }

  /// Pushes the step-up page and completes with whether the user verified the
  /// second factor. Behind `ShellServices.requestStepUp`. If the page goes
  /// away without an answer (a `go`, a redirect or an identity change) it
  /// completes with false.
  Future<bool> _requestStepUp() => _stepUp.request();

  /// Ends the session (in identity too, with a connection) and goes to login.
  Future<void> _signOut() async {
    try {
      await widget.connection?.signOut();
    } finally {
      await signOutAndGoToLogin(router: _router, session: widget.session);
    }
  }

  /// The session follows the access of the real connection. When identity
  /// closes the session (revoked, expired) the user goes back to sign-in.
  void _onAccessChanged() {
    final access = widget.connection?.access.value;
    if (access != null) {
      widget.session.value = UserSession.fromAccess(access);
    } else if (widget.session.value.isAuthenticated) {
      unawaited(signOutAndGoToLogin(router: _router, session: widget.session));
    }
  }

  /// A new identity must not show the previous user's badge or messages, nor
  /// keep waiting for the previous user's step-up.
  void _onIdentityChanged() {
    _stepUp.cancel();
    _unreadCount.value = 0;
    _messengerKey.currentState?.clearSnackBars();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      onGenerateTitle: (context) => AppLocalizations.of(context).appTitle,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      localizationsDelegates: [
        AppLocalizations.delegate,
        ...GlobalMaterialLocalizations.delegates,
      ],
      supportedLocales: supportedLocales,
      routerConfig: _router,
      scaffoldMessengerKey: _messengerKey,
      // Lets the shell chrome use AccessGate and context.can as well.
      builder: (context, child) => ShellAccessScope(
        session: widget.session,
        clock: _runtime.clock,
        paths: const ShellPaths(stepUp: stepUpPath),
        child: child ?? const SizedBox.shrink(),
      ),
    );
  }
}
