import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:shell_core/shell_core.dart';
import 'package:shell_host/shell_host.dart';
import 'package:test_utils/test_utils.dart';

final class _RoutesHarness {
  _RoutesHarness(UserSession initial) : session = ValueNotifier(initial) {
    navigator = ShellNavigator(
      registry: MicrofrontendRegistry(),
      session: session,
      platform: AppPlatform.web,
      paths: const ShellPaths(stepUp: '/step-up'),
    );
    stepUp = StepUpRequests(path: '/step-up');
    routes = ShellRoutes(
      paths: const ShellPaths(stepUp: '/step-up'),
      session: session,
      navigator: navigator,
      stepUp: stepUp,
      onSignOut: () async {
        signOuts++;
      },
      demoProfiles: DemoProfile.values,
    );
    router = GoRouter(routes: routes.build());
    navigator.attach(router);
    stepUp.attach(router);
  }

  final ValueNotifier<UserSession> session;
  late final ShellNavigator navigator;
  late final StepUpRequests stepUp;
  late final ShellRoutes routes;
  late final GoRouter router;
  int signOuts = 0;

  String get path => router.routerDelegate.currentConfiguration.uri.path;

  void dispose() {
    stepUp.dispose();
    router.dispose();
    session.dispose();
  }
}

void main() {
  final l10n = lookupAppLocalizations(const Locale('es'));

  group('ShellRoutes', () {
    test('builds the four routes in order', () {
      final harness = _RoutesHarness(UserSession.anonymous());
      addTearDown(harness.dispose);

      final paths = harness.routes.build().cast<GoRoute>().map(
        (route) => route.path,
      );

      expect(harness.routes.build(), hasLength(4));
      expect(paths, ['/', '/login', '/forbidden', '/step-up']);
    });

    testWidgets('sends anonymous users from step-up to login', (tester) async {
      final harness = _RoutesHarness(UserSession.anonymous());
      addTearDown(harness.dispose);
      await tester.pumpWidget(TestApp().wrapRouter(harness.router));
      await tester.pumpAndSettle();

      harness.router.go('/step-up');
      await tester.pumpAndSettle();

      expect(harness.path, '/login');
    });

    testWidgets('shows step-up to signed-in users', (tester) async {
      final harness = _RoutesHarness(SessionBuilder().build());
      addTearDown(harness.dispose);
      await tester.pumpWidget(TestApp().wrapRouter(harness.router));
      await tester.pumpAndSettle();

      harness.router.go('/step-up');
      await tester.pumpAndSettle();

      expect(harness.path, '/step-up');
      expect(find.text(l10n.stepUpTitle), findsWidgets);
    });

    testWidgets('root goes to login for anonymous users and to forbidden for a '
        'signed-in user with no menu', (tester) async {
      final anonymous = _RoutesHarness(UserSession.anonymous());
      addTearDown(anonymous.dispose);
      await tester.pumpWidget(TestApp().wrapRouter(anonymous.router));
      await tester.pumpAndSettle();
      expect(anonymous.path, '/login');

      final signedIn = _RoutesHarness(SessionBuilder().build());
      addTearDown(signedIn.dispose);
      await tester.pumpWidget(TestApp().wrapRouter(signedIn.router));
      await tester.pumpAndSettle();
      expect(signedIn.path, '/forbidden');
    });

    test('build throws when the paths have no step-up page', () {
      final session = ValueNotifier(UserSession.anonymous());
      addTearDown(session.dispose);
      final routes = ShellRoutes(
        paths: const ShellPaths(),
        session: session,
        navigator: ShellNavigator(
          registry: MicrofrontendRegistry(),
          session: session,
          platform: AppPlatform.web,
          paths: const ShellPaths(),
        ),
        stepUp: StepUpRequests(path: '/step-up'),
        onSignOut: () async {},
        demoProfiles: DemoProfile.values,
      );

      expect(routes.build, throwsA(isA<StateError>()));
    });

    testWidgets('forbidden sign-out runs the sign-out callback', (
      tester,
    ) async {
      final harness = _RoutesHarness(SessionBuilder().build());
      addTearDown(harness.dispose);
      await tester.pumpWidget(TestApp().wrapRouter(harness.router));
      await tester.pumpAndSettle();

      harness.router.go('/forbidden');
      await tester.pumpAndSettle();
      await tester.tap(find.text(l10n.actionSignOut));
      await tester.pumpAndSettle();

      expect(harness.signOuts, 1);
    });
  });
}
