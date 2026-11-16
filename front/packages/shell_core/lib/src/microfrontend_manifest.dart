import 'package:contracts/contracts.dart';
import 'package:go_router/go_router.dart';
import 'package:utils/utils.dart';

import 'access_rule.dart';
import 'deferred_page.dart';
import 'enums.dart';
import 'microfrontend.dart';
import 'microfrontend_scope.dart';
import 'screen_route.dart';
import 'user_session.dart';

/// Turns the rest of an app link into a router location of the
/// microfrontend, or null when the link is not one of its own.
///
/// [rest] holds the path segments after the microfrontend's segment and
/// [query] the query parameters. The result must start with
/// `/${id.pathSegment}`.
typedef DeepLinkResolver = String? Function(
  List<String> rest,
  Map<String, String> query,
);

/// Eager description of a microfrontend, exported by its package.
///
/// The manifest itself is not deferred: the shell reads it at startup to build
/// routes, menu and visibility. Only the screens are deferred.
///
/// Declare screens with [screens] (builders `(scope, {params})`, no
/// `BuildContext`) and the lifecycle with [lifecycleFactory]. The contract is
/// described in ADR 0018.
final class MicrofrontendManifest {
  /// Creates a manifest. Every absolute path in [screens] must
  /// start with `/${id.pathSegment}`.
  const MicrofrontendManifest({
    required this.id,
    required this.platforms,
    required this.access,
    required this.menu,
    this.screens = const [],
    this.flag,
    this.modes = const {ShellMode.demo, ShellMode.live},
    this.lifecycleFactory,
    this.deepLinks,
  });

  /// Unique id of the microfrontend, also its first URL segment.
  final MicrofrontendId id;

  /// Platforms where the microfrontend is included.
  final Set<AppPlatform> platforms;

  /// Rule that decides who can use the microfrontend.
  final AccessRule access;

  /// Feature flag that must be enabled to see the microfrontend, if any.
  final FeatureFlag? flag;

  /// Shell modes the microfrontend can serve. One whose data has no API yet
  /// declares only [ShellMode.demo], and a live shell does not register it.
  final Set<ShellMode> modes;

  /// Navigation entries this microfrontend contributes.
  final List<MenuEntry> menu;

  /// Screens of the microfrontend, built by the shell into routes. Their
  /// builders get the scope of the current identity and the route parameters.
  final List<ScreenRoute> screens;

  /// Builds a new lifecycle for each activation of the microfrontend.
  final Microfrontend Function()? lifecycleFactory;

  /// App links the microfrontend accepts, or null when it accepts none.
  final DeepLinkResolver? deepLinks;

  /// Whether the microfrontend declares a lifecycle.
  bool get hasLifecycle => lifecycleFactory != null;

  /// Lifecycle for a new activation: a fresh instance from
  /// [lifecycleFactory], or null when there is none.
  Microfrontend? createLifecycle() => lifecycleFactory?.call();

  /// Routes built from [screens].
  ///
  /// The shell calls this once per router. Tests of a microfrontend can call
  /// it to mount the real routes in a plain [GoRouter].
  List<GoRoute> buildRoutes(
    ScreenLoader load,
    MicrofrontendScope Function() scope,
  ) => [for (final screen in screens) screen.toGoRoute(load, scope)];

  /// Whether [session] may see this microfrontend on [platform] at [now].
  /// [now] defaults to the system clock.
  ///
  /// Requires the platform to be supported, [access] to allow the session and,
  /// when [flag] is set, the session to hold that flag.
  bool isVisibleTo(
    UserSession session,
    AppPlatform platform, {
    DateTime? now,
  }) =>
      _isAvailable(session, platform) &&
      access.allows(session, now: now ?? systemClock());

  /// Like [isVisibleTo], but an MFA rule counts as passed for a signed-in
  /// session. Menus use it so the user can open a section and step up there.
  bool isReachableBy(
    UserSession session,
    AppPlatform platform, {
    DateTime? now,
  }) =>
      _isAvailable(session, platform) &&
      access.reachableBy(session, now: now ?? systemClock());

  bool _isAvailable(UserSession session, AppPlatform platform) {
    if (!platforms.contains(platform)) return false;
    final requiredFlag = flag;
    return requiredFlag == null || session.flags.contains(requiredFlag);
  }
}
