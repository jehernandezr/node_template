import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

/// Shell pages the access redirects of the backoffice send to.
abstract final class ShellPages {
  static const String login = '/login';
  static const String forbidden = '/forbidden';
  static const String stepUp = '/step-up';

  static const ShellPaths paths = ShellPaths(
    login: login,
    forbidden: forbidden,
    stepUp: stepUp,
  );

  static List<RouteBase> routes() => [
    GoRoute(path: login, builder: (_, _) => const Text('login')),
    GoRoute(path: forbidden, builder: (_, _) => const Text('forbidden')),
    GoRoute(path: stepUp, builder: (_, _) => const Text('step-up')),
  ];
}
