import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'login/forbidden_page.dart';
import 'login/login_page.dart';
import 'login/step_up_page.dart';
import 'screen_loader.dart';
import 'shell/mobile_shell_scaffold.dart';

/// Path of the page that asks for a recent second factor.
const String stepUpPath = '/step-up';

/// Builds the mobile router from the real [registry].
///
/// The microfrontend routes sit inside one [ShellRoute] that draws the
/// navigation. [buildShellRouter] validates their paths and guards them by
/// path, so the router is built from the same routes the app serves.
GoRouter buildMobileRouter({
  required MicrofrontendRegistry registry,
  required ShellRuntime runtime,
  required ValueNotifier<UserSession> session,
  required ValueNotifier<int> unreadCount,
  required Future<void> Function() onSignOut,
}) {
  return buildShellRouter(
    registry: registry,
    platform: AppPlatform.mobile,
    runtime: runtime,
    load: mobileScreenLoader,
    stepUpPath: stepUpPath,
    routes: [
      GoRoute(
        path: '/',
        redirect: (context, state) =>
            homeLocation(registry, session.value, AppPlatform.mobile) ??
            (session.value.isAuthenticated ? '/forbidden' : '/login'),
        builder: (context, state) => const SizedBox.shrink(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => LoginPage(
          session: session,
          from: state.uri.queryParameters['from'],
        ),
      ),
      GoRoute(
        path: '/forbidden',
        builder: (context, state) => ForbiddenPage(onSignOut: onSignOut),
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
    ],
    shellBuilder: (context, state, child) => MobileShellScaffold(
      registry: registry,
      session: session,
      unreadCount: unreadCount,
      onSignOut: onSignOut,
      child: child,
    ),
  );
}
