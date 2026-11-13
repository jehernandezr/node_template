import 'dart:async';

import 'package:auth/auth.dart';
import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import 'router.dart';

/// Root widget of the mobile shell. Owns the [ShellRuntime] and the router.
class MobileShellApp extends StatefulWidget {
  /// Creates the shell for [registry], following [session].
  const MobileShellApp({
    super.key,
    required this.registry,
    required this.session,
  });

  /// Microfrontends composed by this shell.
  final MicrofrontendRegistry registry;

  /// Session source; sign-in and sign-out write to it.
  final ValueNotifier<UserSession> session;

  @override
  State<MobileShellApp> createState() => _MobileShellAppState();
}

class _MobileShellAppState extends State<MobileShellApp> {
  late final ShellRuntime _runtime;
  final DeviceKeyPort _deviceKeys = FakeDeviceKeyPort();
  // Assigned after the runtime; sign-out only runs once the app is up.
  late final GoRouter _router;
  late final StreamSubscription<UnreadCountChanged> _unreadSubscription;
  final ValueNotifier<int> _unreadCount = ValueNotifier<int>(0);
  final GlobalKey<ScaffoldMessengerState> _messengerKey =
      GlobalKey<ScaffoldMessengerState>();

  @override
  void initState() {
    super.initState();
    _runtime = ShellRuntime(
      registry: widget.registry,
      platform: AppPlatform.mobile,
      session: widget.session,
      servicesFactory: (identity) => DefaultShellServices(
        session: identity,
        eventBus: _runtime.eventBus,
        onSignOut: _signOut,
        // Demo: the real Secure Enclave / Keystore adapter replaces this fake.
        extras: {DeviceKeyPort: _deviceKeys},
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
    );
    _runtime.identityEpoch.addListener(_onIdentityChanged);
    _runtime.start();
  }

  @override
  void dispose() {
    _runtime.identityEpoch.removeListener(_onIdentityChanged);
    _unreadSubscription.cancel();
    _router.dispose();
    _runtime.dispose();
    _unreadCount.dispose();
    super.dispose();
  }

  Future<void> _signOut() =>
      signOutAndGoToLogin(router: _router, session: widget.session);

  /// A new identity must not show the previous user's badge or messages.
  void _onIdentityChanged() {
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
