import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';

import 'access_rule.dart';
import 'deferred_page.dart';
import 'microfrontend_scope.dart';
import 'shell_access.dart';

/// Builds a manifest screen from the scope of the current identity.
///
/// There is no [BuildContext]: the screen reads localization, theme and access
/// in its own `build`, inside the deferred library. [params] holds the query
/// parameters and the path parameters of the route; a path parameter wins
/// over a query parameter with the same name.
///
/// Implementations declare the default: `(scope, {params = const {}}) => ...`.
typedef MicrofrontendScreenBuilder = Widget Function(
  MicrofrontendScope scope, {
  Map<String, String> params,
});

/// Declarative route of a microfrontend screen whose library loads on demand.
///
/// The shell turns it into a [GoRoute]: it loads [loadLibrary] through the
/// shell's [ScreenLoader], calls [builder] with the scope of the current
/// identity, rebuilds the page when the identity changes and, when [access]
/// is set, guards the route with [accessRedirect].
final class ScreenRoute {
  /// Creates a screen route. [path] is absolute (`/tasks`) at the top level of
  /// a manifest and relative (`new`, `:id`) inside [routes].
  const ScreenRoute({
    required this.path,
    required this.loadLibrary,
    required this.builder,
    this.name,
    this.access,
    this.loading,
    this.routes = const [],
  });

  /// Path pattern, as in [GoRoute.path].
  final String path;

  /// Optional route name, as in [GoRoute.name].
  final String? name;

  /// `loadLibrary` of the deferred import that holds the screen.
  final Future<void> Function() loadLibrary;

  /// Builds the screen once [loadLibrary] completes.
  final MicrofrontendScreenBuilder builder;

  /// Extra rule for this route and its children, on top of the manifest's
  /// own access rule. Use it for sub-routes such as `/tasks/new`.
  final AccessRule? access;

  /// Shown while the library loads. The shell's loader decides when null.
  final Widget? loading;

  /// Child screens, with relative paths.
  final List<ScreenRoute> routes;

  /// The [GoRoute] for this screen and its children.
  ///
  /// [load] is the shell's [ScreenLoader]; [scope] returns the scope of the
  /// current identity and is called when the page builds.
  GoRoute toGoRoute(ScreenLoader load, MicrofrontendScope Function() scope) {
    final rule = access;
    return GoRoute(
      path: path,
      name: name,
      redirect: rule == null ? null : accessRedirect(rule),
      builder: (context, state) => load(
        loadLibrary: loadLibrary,
        builder: () => builder(scope(), params: screenParams(state)),
        loading: loading,
      ),
      routes: [for (final child in routes) child.toGoRoute(load, scope)],
    );
  }
}

/// Query parameters of [state] overlaid with its path parameters.
Map<String, String> screenParams(GoRouterState state) =>
    Map.unmodifiable({...state.uri.queryParameters, ...state.pathParameters});
