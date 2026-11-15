import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shell_core/shell_core.dart';
import 'package:shell_host/shell_host.dart';
import 'package:test_utils/test_utils.dart';

import 'utils/flow_harness.dart';

/// Pieces a binding needs, built inside the test so that their futures run in
/// the test's own zone.
final class _BindingHarness {
  _BindingHarness() {
    final navigator = ShellNavigator(
      registry: MicrofrontendRegistry(),
      session: session,
      platform: AppPlatform.web,
      paths: const ShellPaths(stepUp: '/step-up'),
    );
    router = GoRouter(
      initialLocation: '/login',
      routes: [
        for (final path in ['/', '/login', '/forbidden'])
          GoRoute(path: path, builder: (context, state) => Text(path)),
      ],
    );
    navigator.attach(router);
    binding = SessionBinding(
      connection: flow.connection,
      session: session,
      navigator: navigator,
    );
  }

  final FlowHarness flow = FlowHarness();
  final ValueNotifier<UserSession> session = ValueNotifier(
    UserSession.anonymous(),
  );
  late final GoRouter router;
  late final SessionBinding binding;

  Future<void> dispose() async {
    binding.stop();
    router.dispose();
    session.dispose();
    await flow.dispose();
  }
}

void main() {
  group('SessionBinding', () {
    testWidgets('does not mirror the access before start', (tester) async {
      final h = _BindingHarness();
      addTearDown(h.dispose);
      await tester.pumpWidget(TestApp().wrapRouter(h.router));

      await h.flow.signIn();
      await tester.pumpAndSettle();

      expect(h.session.value.isAuthenticated, isFalse);
    });

    testWidgets('mirrors the access once started', (tester) async {
      final h = _BindingHarness();
      addTearDown(h.dispose);
      h.binding.start();
      await tester.pumpWidget(TestApp().wrapRouter(h.router));

      await h.flow.signIn();
      await tester.pumpAndSettle();

      expect(h.session.value.isAuthenticated, isTrue);
    });

    testWidgets('a closed identity session signs the user out', (tester) async {
      final h = _BindingHarness();
      addTearDown(h.dispose);
      h.binding.start();
      await tester.pumpWidget(TestApp().wrapRouter(h.router));
      await h.flow.signIn();
      await tester.pumpAndSettle();

      h.router.go('/forbidden');
      await tester.pumpAndSettle();
      await h.flow.connection.signOut();
      await tester.pumpAndSettle();

      expect(h.session.value.isAuthenticated, isFalse);
      expect(h.router.routerDelegate.currentConfiguration.uri.path, '/login');
    });

    testWidgets('stop ends the mirroring and can be called twice', (
      tester,
    ) async {
      final h = _BindingHarness();
      addTearDown(h.dispose);
      h.binding.start();
      await tester.pumpWidget(TestApp().wrapRouter(h.router));
      h.binding.stop();

      await h.flow.signIn();
      await tester.pumpAndSettle();
      h.binding.stop();

      expect(h.session.value.isAuthenticated, isFalse);
    });
  });
}
