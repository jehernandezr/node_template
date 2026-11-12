import 'dart:async';

import 'package:go_router/go_router.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

import 'access_rule.dart';
import 'user_session.dart';

/// Paths of the shell pages that access checks redirect to.
final class ShellPaths {
  /// Creates the paths. Without [stepUp], a session that only lacks a recent
  /// second factor goes to [forbidden].
  const ShellPaths({
    this.login = '/login',
    this.forbidden = '/forbidden',
    this.stepUp,
  });

  /// Sign-in page. Anonymous sessions go here.
  final String login;

  /// Page for signed-in sessions that cannot pass a rule.
  final String forbidden;

  /// Page that asks for a second factor, or null when the shell has none.
  final String? stepUp;

  /// Whether [path] is one of these pages.
  bool contains(String path) =>
      path == login || path == forbidden || path == stepUp;
}

/// Where [decision] sends a request for [location], or null to let it through.
///
/// Anonymous sessions go to [ShellPaths.login], sessions that need a step-up
/// go to [ShellPaths.stepUp] (or [ShellPaths.forbidden] without one) and
/// denied sessions go to [ShellPaths.forbidden]. The original location is
/// kept in `from`.
String? redirectFor(AccessDecision decision, Uri location, ShellPaths paths) {
  if (paths.contains(location.path)) return null;
  final target = switch (decision) {
    AccessDecision.allowed => null,
    AccessDecision.signInRequired => paths.login,
    AccessDecision.stepUpRequired => paths.stepUp ?? paths.forbidden,
    AccessDecision.denied => paths.forbidden,
  };
  if (target == null) return null;
  return '$target?from=${Uri.encodeComponent(location.toString())}';
}

/// Access environment of a shell: the session, the clock and the redirect
/// pages. Read it with [ShellAccessScope.of] or `context.can(rule)`.
///
/// `buildShellRouter` puts one above every microfrontend page. Shells can add
/// another one above the router (for example in `MaterialApp.router.builder`)
/// so the shell chrome can use [AccessGate] too. Tests of a screen wrap it
/// in one to control the session.
class ShellAccessScope extends InheritedNotifier<ValueListenable<UserSession>> {
  /// Exposes [session] to the subtree. Dependents rebuild when it changes.
  const ShellAccessScope({
    super.key,
    required ValueListenable<UserSession> session,
    this.clock = DateTime.now,
    this.paths = const ShellPaths(),
    required super.child,
  }) : super(notifier: session);

  /// Session source.
  ValueListenable<UserSession> get session => notifier!;

  /// Current time, used by [AccessRule.mfa].
  final DateTime Function() clock;

  /// Pages that [accessRedirect] sends rejected requests to.
  final ShellPaths paths;

  /// Nearest scope, registering [context] to rebuild when the session changes.
  ///
  /// Throws a [FlutterError] when there is none.
  static ShellAccessScope of(BuildContext context) {
    final scope = context
        .dependOnInheritedWidgetOfExactType<ShellAccessScope>();
    if (scope == null) {
      throw FlutterError(
        'No ShellAccessScope above this widget.\n'
        'Microfrontend pages get one from buildShellRouter. A widget test of a '
        'screen must wrap it in ShellAccessScope(session: ..., child: ...).',
      );
    }
    return scope;
  }

  /// Nearest scope without registering a dependency, or null.
  static ShellAccessScope? maybeRead(BuildContext context) =>
      context.getInheritedWidgetOfExactType<ShellAccessScope>();

  @override
  bool updateShouldNotify(ShellAccessScope oldWidget) =>
      super.updateShouldNotify(oldWidget) ||
      oldWidget.clock != clock ||
      oldWidget.paths != paths;
}

/// Access checks for widgets.
extension ShellAccessContext on BuildContext {
  /// Whether the current session satisfies [rule] now.
  ///
  /// Reads the nearest [ShellAccessScope] and rebuilds this widget when the
  /// session changes. Use it to enable, hide or explain an action; the API
  /// still checks every request.
  bool can(AccessRule rule) {
    final scope = ShellAccessScope.of(this);
    return rule.allows(scope.session.value, now: scope.clock());
  }
}

/// Shows [child] only when the session satisfies [rule]; otherwise [fallback]
/// (nothing by default).
///
/// Use it for protected actions: buttons, menu items or sections. It rebuilds
/// when the session changes.
class AccessGate extends StatelessWidget {
  /// Creates a gate over [child].
  const AccessGate({
    super.key,
    required this.rule,
    required this.child,
    this.fallback,
  });

  /// Rule the session must satisfy.
  final AccessRule rule;

  /// Shown when allowed.
  final Widget child;

  /// Shown when not allowed. Defaults to an empty box.
  final Widget? fallback;

  @override
  Widget build(BuildContext context) =>
      context.can(rule) ? child : (fallback ?? const SizedBox.shrink());
}

/// Access environment for redirects, set by `buildShellRouter` while it runs
/// route redirects. A zone value, because go_router runs redirects with the
/// router's context, above the pages.
@immutable
final class ShellAccessEnvironment {
  /// Creates an environment.
  const ShellAccessEnvironment({
    required this.session,
    required this.clock,
    required this.paths,
  });

  /// Session source.
  final ValueListenable<UserSession> session;

  /// Current time.
  final DateTime Function() clock;

  /// Redirect pages.
  final ShellPaths paths;

  static final Object _zoneKey = Object();

  /// Runs [body] with this environment visible to [accessRedirect].
  R run<R>(R Function() body) => runZoned(body, zoneValues: {_zoneKey: this});

  /// Environment of the current zone, or null.
  static ShellAccessEnvironment? get current =>
      Zone.current[_zoneKey] as ShellAccessEnvironment?;
}

/// Route-level redirect that guards a sub-route with [rule].
///
/// ```dart
/// GoRoute(
///   path: 'new',
///   redirect: accessRedirect(AccessRule.permissions([Permission.tasksWrite])),
///   builder: ...,
/// )
/// ```
///
/// [ScreenRoute.access] uses it for you. The session, clock and pages come
/// from `buildShellRouter`; in a plain [GoRouter] they come from a
/// [ShellAccessScope] above the router. Throws [StateError] when neither is
/// present, so a guard is never skipped silently.
GoRouterRedirect accessRedirect(AccessRule rule) => (context, state) {
  final environment = ShellAccessEnvironment.current;
  final ValueListenable<UserSession> session;
  final DateTime Function() clock;
  final ShellPaths paths;
  if (environment != null) {
    session = environment.session;
    clock = environment.clock;
    paths = environment.paths;
  } else {
    final scope = ShellAccessScope.maybeRead(context);
    if (scope == null) {
      throw StateError(
        'accessRedirect needs buildShellRouter or a ShellAccessScope above '
        'the router',
      );
    }
    session = scope.session;
    clock = scope.clock;
    paths = scope.paths;
  }
  final decision = rule.decide(session.value, now: clock());
  return redirectFor(decision, state.uri, paths);
};
