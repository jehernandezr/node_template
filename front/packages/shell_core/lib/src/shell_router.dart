import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import 'deferred_page.dart';
import 'enums.dart';
import 'microfrontend.dart';
import 'microfrontend_registry.dart';
import 'shell_navigation.dart';
import 'shell_runtime.dart';

/// Builds the shell's [GoRouter] with the manifest routes and path guards.
///
/// [routes] are shell pages such as home, login and forbidden. They stay at the
/// top level. The routes of the manifests for [platform] are built once, with
/// [load], and placed according to the first matching option:
/// - [wrapRoutes]: called with those routes; its result is added at the top
///   level. Use it for full control of the route tree.
/// - [shellBuilder]: the routes go into one `ShellRoute` with [shellNavigatorKey].
/// - otherwise they are added at the top level.
///
/// Each manifest receives `() => runtime.scopeFor(id)` as its scope accessor.
/// The session comes from [runtime].
///
/// The redirect works by path, not by route tree. It takes the first segment
/// of the location, finds the manifest with that [MicrofrontendId.pathSegment]
/// and checks it:
/// - an anonymous session that the access rule rejects goes to
///   `loginPath?from=<original location>`;
/// - a session that cannot see the manifest on [platform] goes to
///   `forbiddenPath?from=<original location>`.
/// Locations already on the login or forbidden path are never redirected.
///
/// Throws [StateError] at startup if a manifest has an absolute route path
/// outside `/${id.pathSegment}`, or if [loginPath] or [forbiddenPath] belongs
/// to a microfrontend segment.
GoRouter buildShellRouter({
  required MicrofrontendRegistry registry,
  required AppPlatform platform,
  required ShellRuntime runtime,
  required List<RouteBase> routes,
  ShellRouteBuilder? shellBuilder,
  GlobalKey<NavigatorState>? shellNavigatorKey,
  RouteBase Function(List<RouteBase> microfrontendRoutes)? wrapRoutes,
  ScreenLoader load = deferredPage,
  String loginPath = '/login',
  String forbiddenPath = '/forbidden',
}) {
  assert(
    wrapRoutes == null || shellBuilder == null,
    'Pass wrapRoutes or shellBuilder, not both',
  );
  _assertNotMicrofrontendPath(loginPath, 'loginPath');
  _assertNotMicrofrontendPath(forbiddenPath, 'forbiddenPath');

  final microfrontendRoutes = <RouteBase>[];
  for (final manifest in registry.manifests) {
    final prefix = '/${manifest.id.pathSegment}';
    final built = manifest.routes(load, () => runtime.scopeFor(manifest.id));
    for (final path in _absolutePaths(built)) {
      if (path != prefix && !path.startsWith('$prefix/')) {
        throw StateError(
          'Route "$path" of ${manifest.id.name} must start with "$prefix"',
        );
      }
    }
    if (manifest.platforms.contains(platform)) {
      microfrontendRoutes.addAll(built);
    }
  }

  final List<RouteBase> topLevel;
  if (wrapRoutes != null) {
    topLevel = [...routes, wrapRoutes(microfrontendRoutes)];
  } else if (shellBuilder != null) {
    topLevel = [
      ...routes,
      ShellRoute(
        navigatorKey: shellNavigatorKey,
        builder: shellBuilder,
        routes: microfrontendRoutes,
      ),
    ];
  } else {
    topLevel = [...routes, ...microfrontendRoutes];
  }

  final session = runtime.session;
  return GoRouter(
    routes: topLevel,
    refreshListenable: session,
    redirect: (context, state) {
      final path = state.uri.path;
      if (path == loginPath || path == forbiddenPath) return null;

      final id = MicrofrontendIdPath.fromPath(state.uri.toString());
      final manifest = id == null ? null : registry.manifestFor(id);
      if (manifest == null) return null;

      final current = session.value;
      if (!current.isAuthenticated && !manifest.access.allows(current)) {
        return _withFrom(loginPath, state.uri.toString());
      }
      if (!manifest.isVisibleTo(current, platform)) {
        return _withFrom(forbiddenPath, state.uri.toString());
      }
      return null;
    },
  );
}

void _assertNotMicrofrontendPath(String path, String name) {
  if (MicrofrontendIdPath.fromPath(path) != null) {
    throw StateError('$name "$path" belongs to a microfrontend segment');
  }
}

String _withFrom(String path, String original) =>
    '$path?from=${Uri.encodeComponent(original)}';

/// Absolute paths of every route in [routes], searching nested routes too.
Iterable<String> _absolutePaths(List<RouteBase> routes) sync* {
  for (final route in routes) {
    if (route is GoRoute) {
      if (route.path.startsWith('/')) yield route.path;
      yield* _absolutePaths(route.routes);
    } else if (route is ShellRoute) {
      yield* _absolutePaths(route.routes);
    } else if (route is StatefulShellRoute) {
      for (final branch in route.branches) {
        yield* _absolutePaths(branch.routes);
      }
    }
  }
}
