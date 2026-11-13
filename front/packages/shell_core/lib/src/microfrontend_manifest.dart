import 'package:contracts/contracts.dart';
import 'package:go_router/go_router.dart';

import 'access_rule.dart';
import 'deferred_page.dart';
import 'enums.dart';
import 'microfrontend.dart';
import 'microfrontend_scope.dart';
import 'screen_route.dart';

/// Builds the hand-written routes of a manifest. See
/// [MicrofrontendManifest.routes].
typedef ManifestRoutesBuilder = List<RouteBase> Function(
  ScreenLoader load,
  MicrofrontendScope Function() scope,
);

List<RouteBase> _noRoutes(
  ScreenLoader load,
  MicrofrontendScope Function() scope,
) => const [];

/// Eager description of a microfrontend, exported by its package.
///
/// The manifest itself is not deferred: the shell reads it at startup to build
/// routes, menu and visibility. Only the screens are deferred.
///
/// Declare screens with [screens] (builders `(scope, {params})`, no
/// `BuildContext`) and the lifecycle with [lifecycleFactory]. The contract is
/// described in ADR 0018.
final class MicrofrontendManifest implements MicrofrontendDescriptor {
  /// Creates a manifest. Every absolute path in [screens] and [routes] must
  /// start with `/${id.pathSegment}`.
  const MicrofrontendManifest({
    required this.id,
    required this.platforms,
    required this.access,
    required this.menu,
    @Deprecated(
      'Use screens: [ScreenRoute(...)] with builders (scope, {params}). '
      'See ADR 0018.',
    )
    this.routes = _noRoutes,
    this.screens = const [],
    this.flag,
    @Deprecated(
      'Use lifecycleFactory, so each runtime and identity gets its own '
      'instance. See ADR 0018.',
    )
    this.lifecycle,
    this.lifecycleFactory,
  }) : assert(
         lifecycle == null || lifecycleFactory == null,
         'Pass lifecycle or lifecycleFactory, not both',
       );

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

  /// Hand-written routes (legacy). Receives the screen loader and a scope
  /// accessor; call `scope()` inside a builder to reach the objects of the
  /// current identity. New code uses [screens].
  final ManifestRoutesBuilder routes;

  /// Screens of the microfrontend, built by the shell into routes. Their
  /// builders get the scope of the current identity and the route parameters.
  final List<ScreenRoute> screens;

  /// Shared lifecycle instance (legacy). New code uses [lifecycleFactory].
  final Microfrontend? lifecycle;

  /// Builds a new lifecycle for each activation of the microfrontend.
  final Microfrontend Function()? lifecycleFactory;

  /// Whether the microfrontend declares a lifecycle.
  bool get hasLifecycle => lifecycleFactory != null || lifecycle != null;

  /// Lifecycle for a new activation: a fresh instance from
  /// [lifecycleFactory], else the shared [lifecycle], else null.
  Microfrontend? createLifecycle() => lifecycleFactory?.call() ?? lifecycle;

  /// Routes of [routes] followed by those built from [screens].
  ///
  /// The shell calls this once per router. Tests of a microfrontend can call
  /// it to mount the real routes in a plain [GoRouter].
  List<RouteBase> buildRoutes(
    ScreenLoader load,
    MicrofrontendScope Function() scope,
  ) => [
    ...routes(load, scope),
    for (final screen in screens) screen.toGoRoute(load, scope),
  ];
}
