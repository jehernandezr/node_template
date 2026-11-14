import 'package:contracts/contracts.dart';
import 'package:go_router/go_router.dart';

import 'access_rule.dart';
import 'deferred_page.dart';
import 'enums.dart';
import 'microfrontend.dart';
import 'microfrontend_scope.dart';
import 'screen_route.dart';

/// Eager description of a microfrontend, exported by its package.
///
/// The manifest itself is not deferred: the shell reads it at startup to build
/// routes, menu and visibility. Only the screens are deferred.
///
/// Declare screens with [screens] (builders `(scope, {params})`, no
/// `BuildContext`) and the lifecycle with [lifecycleFactory]. The contract is
/// described in ADR 0018.
final class MicrofrontendManifest implements MicrofrontendDescriptor {
  /// Creates a manifest. Every absolute path in [screens] must
  /// start with `/${id.pathSegment}`.
  const MicrofrontendManifest({
    required this.id,
    required this.platforms,
    required this.access,
    required this.menu,
    this.screens = const [],
    this.flag,
    this.lifecycleFactory,
  });

  @override
  final MicrofrontendId id;

  @override
  final Set<AppPlatform> platforms;

  @override
  final AccessRule access;

  @override
  final FeatureFlag? flag;

  /// Navigation entries this microfrontend contributes.
  final List<MenuEntry> menu;

  /// Screens of the microfrontend, built by the shell into routes. Their
  /// builders get the scope of the current identity and the route parameters.
  final List<ScreenRoute> screens;

  /// Builds a new lifecycle for each activation of the microfrontend.
  final Microfrontend Function()? lifecycleFactory;

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
}
