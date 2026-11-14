import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

void main() {
  group(ScreenRoute, () {
    testWidgets(
      'deferred builds the screen with the scope and the params, the path wins over the query',
      (tester) async {
        final scope = MicrofrontendScope(
          ShellServices(session: UserSession.anonymous(), mode: ShellMode.demo),
        );
        MicrofrontendScope? received;
        final route = ScreenRoute.deferred(
          '/tasks/:id',
          library: () async {},
          build: (screenScope, params) {
            received = screenScope;
            return Text('id=${params.require('id')} q=${params['q']}');
          },
        );
        final router = GoRouter(
          initialLocation: '/tasks/7?q=a&id=9',
          routes: [route.toGoRoute(DeferredLibraryLoader().page, () => scope)],
        );
        addTearDown(router.dispose);

        await tester.pumpWidget(
          WidgetsApp.router(
            color: const Color(0xFF000000),
            routerConfig: router,
          ),
        );
        await tester.pumpAndSettle();

        expect(find.text('id=7 q=a'), findsOneWidget);
        expect(identical(received, scope), isTrue);
      },
    );

    test('deferred keeps name, access, loading and children', () {
      final access = AccessRule.authenticated();
      const loading = Text('wait');
      final route = ScreenRoute.deferred(
        '/tasks',
        library: () async {},
        build: (_, _) => const SizedBox(),
        name: 'tasks',
        access: access,
        loading: loading,
        routes: [
          ScreenRoute.deferred(
            'new',
            library: () async {},
            build: (_, _) => const SizedBox(),
          ),
        ],
      );

      expect(route.path, '/tasks');
      expect(route.name, 'tasks');
      expect(identical(route.access, access), isTrue);
      expect(identical(route.loading, loading), isTrue);
      expect(route.routes, hasLength(1));
      expect(route.routes.single.path, 'new');
    });
  });

  group('ScreenParamsX', () {
    test('require returns the value when present', () {
      expect({'id': '7'}.require('id'), '7');
    });

    test('require throws StateError when the parameter is missing', () {
      expect(() => <String, String>{}.require('id'), throwsStateError);
    });
  });
}
