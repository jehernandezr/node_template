import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

void main() {
  late StepUpRequests requests;
  late GoRouter router;

  Future<void> mount(WidgetTester tester) async {
    requests = StepUpRequests(path: '/step-up');
    router = GoRouter(
      initialLocation: '/home',
      routes: [
        GoRoute(path: '/home', builder: (_, _) => const Text('home')),
        GoRoute(path: '/other', builder: (_, _) => const Text('other')),
        GoRoute(
          path: '/step-up',
          builder: (context, state) => Column(
            children: [
              const Text('step-up'),
              if (requests.isRequest(state.extra))
                TextButton(
                  onPressed: () {
                    requests.complete(true);
                    context.pop(true);
                  },
                  child: const Text('verify'),
                ),
              TextButton(
                onPressed: () => context.pop(false),
                child: const Text('back'),
              ),
            ],
          ),
        ),
      ],
    );
    requests.attach(router);
    addTearDown(() {
      requests.dispose();
      router.dispose();
    });
    await tester.pumpWidget(MaterialApp.router(routerConfig: router));
    await tester.pumpAndSettle();
  }

  testWidgets('completes with true when the page verifies', (tester) async {
    await mount(tester);
    bool? result;
    requests.request().then((value) => result = value);
    await tester.pumpAndSettle();
    expect(find.text('step-up'), findsOneWidget);

    await tester.tap(find.text('verify'));
    await tester.pumpAndSettle();

    expect(result, isTrue);
    expect(find.text('home'), findsOneWidget);
    expect(requests.isPending, isFalse);
  });

  testWidgets('completes with false when the page pops back', (tester) async {
    await mount(tester);
    bool? result;
    requests.request().then((value) => result = value);
    await tester.pumpAndSettle();

    await tester.tap(find.text('back'));
    await tester.pumpAndSettle();

    expect(result, isFalse);
  });

  testWidgets('completes with false when a go replaces the page', (
    tester,
  ) async {
    await mount(tester);
    bool? result;
    requests.request().then((value) => result = value);
    await tester.pumpAndSettle();
    expect(find.text('step-up'), findsOneWidget);

    router.go('/other');
    await tester.pumpAndSettle();

    expect(find.text('other'), findsOneWidget);
    expect(result, isFalse);
    expect(requests.isPending, isFalse);
  });

  testWidgets('a second request shares the pending one', (tester) async {
    await mount(tester);
    final first = requests.request();
    final second = requests.request();
    await tester.pumpAndSettle();
    expect(find.text('step-up'), findsOneWidget);

    await tester.tap(find.text('verify'));
    await tester.pumpAndSettle();

    expect(await first, isTrue);
    expect(await second, isTrue);
  });

  testWidgets('cancel answers false, as on an identity change', (tester) async {
    await mount(tester);
    bool? result;
    requests.request().then((value) => result = value);
    await tester.pumpAndSettle();

    requests.cancel();
    await tester.pump();

    expect(result, isFalse);
  });
}
