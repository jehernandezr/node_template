import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mf_billing/mf_billing.dart';
import 'package:shell_core/shell_core.dart';

Widget _loader({
  required Future<void> Function() loadLibrary,
  required Widget Function() builder,
  Widget? loading,
  Widget Function(Object error, VoidCallback retry)? errorBuilder,
}) => const SizedBox.shrink();

/// Every route path below [routes], with the parent prefix joined.
Iterable<String> _paths(List<RouteBase> routes, [String prefix = '']) sync* {
  for (final route in routes.whereType<GoRoute>()) {
    final full = route.path.startsWith('/')
        ? route.path
        : '$prefix/${route.path}';
    yield full;
    yield* _paths(route.routes, full);
  }
}

void main() {
  test('manifest id matches package', () {
    expect(billingManifest.id, MicrofrontendId.billing);
  });

  test('routes are nested under /billing', () {
    final routes = billingManifest.routes(
      _loader,
      () => throw StateError('not called while building routes'),
    );
    expect(_paths(routes).toList(), [
      '/billing',
      '/billing/invoices',
      '/billing/invoices/:id',
    ]);
  });
}
