import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:utils/utils.dart';

import 'access_rule.dart';
import 'deferred_library_loader.dart';
import 'enums.dart';
import 'microfrontend_manifest.dart';
import 'microfrontend_registry.dart';
import 'screen_route.dart';
import 'shell_access.dart';
import 'shell_runtime.dart';

/// Builds the shell's [GoRouter] with the manifest routes and path guards.
///
/// The routes passed to [build] are shell pages such as home, login, forbidden
/// and step-up. They stay at the top level. The routes of the manifests for
/// the platform are built once, with the loader, and go into one `ShellRoute`
/// drawn by `shellBuilder`.
///
/// Each manifest receives `() => runtime.scopeFor(id)` as its scope accessor.
/// The session comes from the runtime.
///
/// Every page of a manifest route (each `GoRoute.builder` built from
/// `screens`) is wrapped in a [ShellAccessScope] and in a
/// [KeyedSubtree] keyed by [ShellRuntime.identityEpoch], the route's
/// `matchedLocation` and the query: when the user or tenant changes, or the
/// page's own path or query parameters change, the mounted page is built
/// again from scratch, so its controllers never keep the previous entity.
/// Opening a child route leaves the parent page's key and state untouched. A
/// page the new identity cannot reach is replaced by an empty box until the
/// redirect removes it. A page is
/// reachable when the identity can reach the microfrontend and every
/// [ScreenRoute.access] rule of the page and its parent routes.
/// Route-level redirects run with the shell's access environment, so
/// [accessRedirect] works in them.
///
/// The top-level redirect works by path, not by route tree. It takes the first
/// segment of the location, finds the registered manifest with that
/// [MicrofrontendId.pathSegment] and checks its access rule at the clock time:
/// - an anonymous session that the rule rejects goes to
///   `paths.login?from=<original location>`;
/// - a session that cannot see the manifest on the platform (platform or flag)
///   goes to `paths.forbidden?from=<original location>`;
/// - a signed-in session that only lacks a recent second factor
///   (`AccessRule.mfa`) goes to `paths.stepUp?from=<original location>`, or
///   to the forbidden page when the shell has no step-up page;
/// - any other rejected session goes to the forbidden page.
/// Locations already on the login, forbidden or step-up path are never
/// redirected.
final class ShellRouterFactory {
  /// Creates a factory. [clock] defaults to [ShellRuntime.clock].
  ShellRouterFactory({
    required this._registry,
    required this._platform,
    required this._runtime,
    required DeferredLibraryLoader loader,
    this._paths = const ShellPaths(),
    Clock? clock,
  }) : _load = loader.page,
       _clock = clock ?? _runtime.clock;

  final MicrofrontendRegistry _registry;
  final AppPlatform _platform;
  final ShellRuntime _runtime;
  final ScreenLoader _load;
  final ShellPaths _paths;
  final Clock _clock;

  /// Validates paths, wraps every page with the identity epoch and the access
  /// scope, and returns the router. Throws [StateError] when a shell page of
  /// the paths belongs to a microfrontend segment or a manifest route lies
  /// outside its microfrontend's segment.
  GoRouter build({
    required List<RouteBase> routes,
    required ShellRouteBuilder shellBuilder,
  }) {
    _validateShellPaths();
    final microfrontendRoutes = _microfrontendRoutes();
    return GoRouter(
      routes: [
        ...routes,
        // go_router rejects an empty ShellRoute: a shell may register no screens.
        if (microfrontendRoutes.isNotEmpty)
          ShellRoute(builder: shellBuilder, routes: microfrontendRoutes),
      ],
      refreshListenable: _runtime.session,
      redirect: (context, state) => _redirect(state.uri),
    );
  }

  void _validateShellPaths() {
    for (final (name, path) in [
      ('login', _paths.login),
      ('forbidden', _paths.forbidden),
      ('stepUp', _paths.stepUp),
    ]) {
      if (path != null && _registry.manifestForPath(path) != null) {
        throw StateError(
          '$name path "$path" belongs to a microfrontend segment',
        );
      }
    }
  }

  /// The routes of every manifest, validated, and wrapped for the manifests
  /// of this platform.
  List<GoRoute> _microfrontendRoutes() {
    final environment = ShellAccessEnvironment(
      session: _runtime.session,
      clock: _clock,
      paths: _paths,
    );
    final wrapped = <GoRoute>[];
    for (final manifest in _registry.manifests) {
      final built = manifest.buildRoutes(
        _load,
        () => _runtime.scopeFor(manifest.id),
      );
      _validateSegment(manifest, built);
      if (!manifest.platforms.contains(_platform)) continue;
      final wrapper = _PageWrapper(_runtime, environment, manifest, _platform);
      // `buildRoutes` keeps the order of `screens`, children included.
      for (var i = 0; i < built.length; i++) {
        wrapped.add(wrapper.wrap(built[i], manifest.screens[i], const []));
      }
    }
    return wrapped;
  }

  void _validateSegment(MicrofrontendManifest manifest, List<GoRoute> built) {
    final prefix = '/${manifest.id.pathSegment}';
    for (final path in _absolutePaths(built)) {
      if (path != prefix && !path.startsWith('$prefix/')) {
        throw StateError(
          'Route "$path" of ${manifest.id.name} must start with "$prefix"',
        );
      }
    }
  }

  String? _redirect(Uri location) {
    if (_paths.contains(location.path)) return null;

    final manifest = _registry.manifestForPath(location.path);
    if (manifest == null) return null;

    final session = _runtime.session.value;
    final now = _clock();
    final decision = manifest.access.decide(session, now: now);
    if (decision == AccessDecision.signInRequired) {
      return _paths.redirectFor(decision, location);
    }
    if (!manifest.isReachableBy(session, _platform, now: now)) {
      return _paths.redirectFor(AccessDecision.denied, location);
    }
    return _paths.redirectFor(decision, location);
  }
}

/// Wraps the pages and redirects of manifest routes. See [ShellRouterFactory].
final class _PageWrapper {
  _PageWrapper(this.runtime, this.environment, this.manifest, this.platform);

  final ShellRuntime runtime;
  final ShellAccessEnvironment environment;
  final MicrofrontendManifest manifest;
  final AppPlatform platform;

  /// Wraps [route], built from [screen]. [inherited] holds the access rules
  /// of the parent screens.
  GoRoute wrap(GoRoute route, ScreenRoute screen, List<AccessRule> inherited) {
    final rule = screen.access;
    final rules = rule == null ? inherited : [...inherited, rule];
    final builder = route.builder;
    final redirect = route.redirect;
    return GoRoute(
      path: route.path,
      name: route.name,
      builder: builder == null
          ? null
          : (context, state) =>
                _page(rules, state, (context) => builder(context, state)),
      redirect: redirect == null ? null : _redirect(redirect),
      routes: [
        for (var i = 0; i < route.routes.length; i++)
          wrap(route.routes[i] as GoRoute, screen.routes[i], rules),
      ],
    );
  }

  GoRouterRedirect _redirect(GoRouterRedirect redirect) =>
      (context, state) => environment.run(() => redirect(context, state));

  Widget _page(
    List<AccessRule> rules,
    GoRouterState state,
    Widget Function(BuildContext context) build,
  ) => ShellAccessScope(
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
        if (!manifest.isReachableBy(session, platform, now: now) ||
            !rules.every((rule) => rule.reachableBy(session, now: now))) {
          return const SizedBox.shrink();
        }
        return KeyedSubtree(
          key: ValueKey<(int, String, String)>((
            epoch,
            state.matchedLocation,
            state.uri.query,
          )),
          child: Builder(builder: build),
        );
      },
    ),
  );
}

/// Absolute paths of every route in [routes], searching nested routes too.
Iterable<String> _absolutePaths(List<GoRoute> routes) sync* {
  for (final route in routes) {
    if (route.path.startsWith('/')) yield route.path;
    yield* _absolutePaths(route.routes.cast<GoRoute>());
  }
}
