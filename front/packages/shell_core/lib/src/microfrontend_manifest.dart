import 'package:contracts/contracts.dart';
import 'package:go_router/go_router.dart';

import 'access_rule.dart';
import 'deferred_page.dart';
import 'enums.dart';
import 'microfrontend.dart';
import 'microfrontend_scope.dart';

/// Eager description of a microfrontend, exported by its package.
///
/// The manifest itself is not deferred: the shell reads it at startup to build
/// routes, menu and visibility. Only the screens are deferred, through the
/// [ScreenLoader] passed to [routes].
final class MicrofrontendManifest implements MicrofrontendDescriptor {
  /// Creates a manifest. [routes] receives the screen loader and a scope
  /// accessor, and returns routes whose absolute paths start with
  /// `/${id.pathSegment}`. The accessor is called lazily, at screen build time.
  const MicrofrontendManifest({
    required this.id,
    required this.platforms,
    required this.access,
    required this.menu,
    required this.routes,
    this.flag,
    this.lifecycle,
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

  /// Builds the routes. Wrap deferred screens with `load`; call `scope()` inside
  /// a builder to reach the objects of the current identity.
  final List<RouteBase> Function(
    ScreenLoader load,
    MicrofrontendScope Function() scope,
  )
  routes;

  /// Optional lifecycle hooks.
  final Microfrontend? lifecycle;
}
