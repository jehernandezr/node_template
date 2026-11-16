import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:test_utils/test_utils.dart';

void main() {
  final repeated = RoutePaths([
    GoRoute(
      path: '/login',
      builder: (context, state) => const SizedBox.shrink(),
    ),
    ShellRoute(
      builder: (context, state, child) => child,
      routes: [
        GoRoute(
          path: '/a',
          builder: (context, state) => const SizedBox.shrink(),
          routes: [
            GoRoute(
              path: 'b',
              builder: (context, state) => const SizedBox.shrink(),
            ),
          ],
        ),
        GoRoute(
          path: '/a',
          builder: (context, state) => const SizedBox.shrink(),
        ),
      ],
    ),
  ]);

  test('lists every path in tree order, joining relative children', () {
    expect(repeated.all, ['/login', '/a', '/a/b', '/a']);
  });

  test('reports the paths that appear more than once', () {
    expect(repeated.duplicated, {'/a'});
  });

  test('a list without repeated paths has no duplicates', () {
    final unique = RoutePaths([
      GoRoute(
        path: '/login',
        builder: (context, state) => const SizedBox.shrink(),
      ),
      GoRoute(
        path: '/tasks',
        builder: (context, state) => const SizedBox.shrink(),
      ),
    ]);

    expect(unique.duplicated, isEmpty);
  });
}
