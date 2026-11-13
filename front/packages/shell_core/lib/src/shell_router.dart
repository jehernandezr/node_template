import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import 'access_rule.dart';
import 'deferred_page.dart';
import 'enums.dart';
import 'microfrontend.dart';
import 'microfrontend_manifest.dart';
import 'microfrontend_registry.dart';
import 'shell_access.dart';
import 'shell_navigation.dart';
import 'shell_runtime.dart';

/// Builds the shell's [GoRouter] with the manifest routes and path guards.
///
/// [routes] are shell pages such as home, login, forbidden and step-up. They
/// stay at the top level. The routes of the manifests for [platform] are built
/// once, with [load], and placed according to the first matching option:
/// - [wrapRoutes]: called with those routes; its result is added at the top
///   level. Use it for full control of the route tree.
/// - [shellBuilder]: the routes go into one `ShellRoute` with [shellNavigatorKey].
/// - otherwise they are added at the top level.
///
/// Each manifest receives `() => runtime.scopeFor(id)` as its scope accessor.
/// The session comes from [runtime].
///
/// Every page of a manifest route (each `GoRoute.builder` built from
/// `screens`) is wrapped in a [ShellAccessScope] and in a
/// [KeyedSubtree] keyed by [ShellRuntime.identityEpoch]: when the user or
/// tenant changes, the mounted pages are built again from scratch with the
/// scope of the new identity, or replaced by an empty box when the new
/// identity cannot use the microfrontend (until the redirect removes them).
/// Route-level redirects run with the shell's access environment, so
/// [accessRedirect] works in them.
///
/// The top-level redirect works by path, not by route tree. It takes the first
/// segment of the location, finds the manifest with that
/// [MicrofrontendId.pathSegment] and checks its access rule at [clock]:
/// - an anonymous session that the rule rejects goes to
///   `loginPath?from=<original location>`;
/// - a session that cannot see the manifest on [platform] (platform or flag)
///   goes to `forbiddenPath?from=<original location>`;
/// - a signed-in session that only lacks a recent second factor
///   (`AccessRule.mfa`) goes to `stepUpPath?from=<original location>`, or to
///   the forbidden page when [stepUpPath] is null;
/// - any other rejected session goes to the forbidden page.
/// Locations already on the login, forbidden or step-up path are never
/// redirected.
///
/// Throws [StateError] at startup if a manifest has an absolute route path
/// outside `/${id.pathSegment}`, or if [loginPath], [forbiddenPath] or
/// [stepUpPath] belongs to a microfrontend segment. [clock] defaults to
/// [ShellRuntime.clock].
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
  String? stepUpPath,
  DateTime Function()? clock,
}) {
  assert(
    wrapRoutes == null || shellBuilder == null,
    'Pass wrapRoutes or shellBuilder, not both',
  );
  _assertNotMicrofrontendPath(loginPath, 'loginPath');
  _assertNotMicrofrontendPath(forbiddenPath, 'forbiddenPath');
  if (stepUpPath != null) _assertNotMicrofrontendPath(stepUpPath, 'stepUpPath');

  final now = clock ?? runtime.clock;
  final paths = ShellPaths(
    login: loginPath,
    forbidden: forbiddenPath,
    stepUp: stepUpPath,
  );
  final environment = ShellAccessEnvironment(
    session: runtime.session,
    clock: now,
    paths: paths,
  );

  final microfrontendRoutes = <GoRoute>[];
  for (final manifest in registry.manifests) {
    final prefix = '/${manifest.id.pathSegment}';
    final built = manifest.buildRoutes(
      load,
      () => runtime.scopeFor(manifest.id),
    );
    for (final path in _absolutePaths(built)) {
      if (path != prefix && !path.startsWith('$prefix/')) {
        throw StateError(
          'Route "$path" of ${manifest.id.name} must start with "$prefix"',
        );
      }
    }
    if (manifest.platforms.contains(platform)) {
      final wrapper = _PageWrapper(runtime, environment, manifest, platform);
      microfrontendRoutes.addAll(built.map(wrapper.wrap));
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
      if (paths.contains(state.uri.path)) return null;

      final id = MicrofrontendIdPath.fromPath(state.uri.toString());
      final manifest = id == null ? null : registry.manifestFor(id);
      if (manifest == null) return null;

      final current = session.value;
      final decision = manifest.access.decide(current, now: now());
      if (decision == AccessDecision.signInRequired) {
        return redirectFor(decision, state.uri, paths);
      }
      if (!manifest.isReachableBy(current, platform, now: now())) {
        return redirectFor(AccessDecision.denied, state.uri, paths);
      }
      return redirectFor(decision, state.uri, paths);
    },
  );
}

/// Wraps the pages and redirects of manifest routes. See [buildShellRouter].
final class _PageWrapper {
  _PageWrapper(this.runtime, this.environment, this.manifest, this.platform);

  final ShellRuntime runtime;
  final ShellAccessEnvironment environment;
  final MicrofrontendManifest manifest;
  final AppPlatform platform;

  GoRoute wrap(GoRoute route) {
    final builder = route.builder;
    final redirect = route.redirect;
    return GoRoute(
      path: route.path,
      name: route.name,
      builder: builder == null
          ? null
          : (context, state) => _page((context) => builder(context, state)),
      redirect: redirect == null ? null : _redirect(redirect),
      routes: route.routes.map((child) => wrap(child as GoRoute)).toList(),
    );
  }

  GoRouterRedirect _redirect(GoRouterRedirect redirect) =>
      (context, state) => environment.run(() => redirect(context, state));

  Widget _page(Widget Function(BuildContext context) build) => ShellAccessScope(
    session: runtime.session,
    clock: environment.clock,
    paths: environment.paths,
    child: ValueListenableBuilder<int>(
      valueListenable: runtime.identityEpoch,
      builder: (context, epoch, _) {
        // After a sign-out or a switch to a user without access, the page
        // is still mounted until the redirect (or its exit transition)
        // removes it: never build it for an identity that cannot use it.
        final session = runtime.session.value;
        final now = environment.clock();
        if (!manifest.isReachableBy(session, platform, now: now)) {
          return const SizedBox.shrink();
        }
        return KeyedSubtree(
          key: ValueKey<int>(epoch),
          child: Builder(builder: build),
        );
      },
    ),
  );
}

void _assertNotMicrofrontendPath(String path, String name) {
  if (MicrofrontendIdPath.fromPath(path) != null) {
    throw StateError('$name "$path" belongs to a microfrontend segment');
  }
}

/// Absolute paths of every route in [routes], searching nested routes too.
Iterable<String> _absolutePaths(List<GoRoute> routes) sync* {
  for (final route in routes) {
    if (route.path.startsWith('/')) yield route.path;
    yield* _absolutePaths(route.routes.cast<GoRoute>());
  }
}
