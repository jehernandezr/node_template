import 'package:go_router/go_router.dart';

/// Full path of every [GoRoute] in a router tree, nested routes included,
/// so a test can check that the shell registers each route once.
final class RoutePaths {
  /// Reads the paths of [routes], usually `router.configuration.routes`.
  const RoutePaths(this.routes);

  /// Top-level routes of the tree.
  final List<RouteBase> routes;

  /// Every path in tree order. A relative child path is joined to its
  /// parent's; a [ShellRoute] adds no segment of its own.
  List<String> get all {
    final paths = <String>[];
    _collect(routes, '', paths);
    return paths;
  }

  /// Paths that appear more than once in [all].
  Set<String> get duplicated {
    final seen = <String>{};
    final repeated = <String>{};
    for (final path in all) {
      if (!seen.add(path)) repeated.add(path);
    }
    return repeated;
  }

  static void _collect(
    List<RouteBase> routes,
    String parent,
    List<String> paths,
  ) {
    for (final route in routes) {
      if (route is GoRoute) {
        final full = route.path.startsWith('/')
            ? route.path
            : '$parent/${route.path}';
        paths.add(full);
        _collect(route.routes, full, paths);
      } else if (route is ShellRoute) {
        _collect(route.routes, parent, paths);
      }
    }
  }
}
