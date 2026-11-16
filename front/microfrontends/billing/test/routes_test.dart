import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mf_billing/mf_billing.dart';
import 'package:shell_core/shell_core.dart';

import 'utils/billing_sessions.dart';
import 'utils/billing_test_app.dart';

MicrofrontendScope _scope() => MicrofrontendScope(
  ShellServices(mode: ShellMode.demo, session: UserSession.anonymous()),
);

void main() {
  group('routes', () {
    Future<void> mount(
      WidgetTester tester,
      UserSession session,
      String initial,
    ) async {
      final scope = _scope();
      final router = GoRouter(
        initialLocation: initial,
        routes: [
          ...billingManifest.buildRoutes(
            DeferredLibraryLoader().page,
            () => scope,
          ),
          GoRoute(
            path: '/forbidden',
            builder: (_, _) => const Text('forbidden-page'),
          ),
          GoRoute(path: '/login', builder: (_, _) => const Text('login-page')),
        ],
      );
      addTearDown(router.dispose);
      await tester.pumpWidget(
        BillingTestApp(session: session).wrapRouter(router),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('/billing/invoices renders through the deferred library', (
      tester,
    ) async {
      await mount(tester, BillingSessions.writer(), '/billing/invoices');
      expect(find.text(BillingTestApp.es.invoicesTitle), findsOneWidget);
      expect(find.text('FAC-2026-0010'), findsOneWidget);
    });

    testWidgets('the invoice id comes from params', (tester) async {
      await mount(
        tester,
        BillingSessions.writer(),
        '/billing/invoices/inv_002',
      );
      expect(find.text('FAC-2026-0008'), findsOneWidget);
    });

    testWidgets('a session without the permission is redirected', (
      tester,
    ) async {
      await mount(tester, BillingSessions.none(), '/billing/invoices');
      expect(find.text('forbidden-page'), findsOneWidget);
    });
  });
}
