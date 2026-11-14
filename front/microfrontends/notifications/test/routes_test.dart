import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import 'support/test_app.dart';

void main() {
  setUp(resetDeferredPageCache);

  late MicrofrontendScope scope;

  setUp(() {
    scope = testScope();
    addTearDown(scope.dispose);
  });

  testWidgets('the inbox route shows the inbox in Spanish', (tester) async {
    await tester.pumpWidget(routedApp(scope));
    await tester.pumpAndSettle();

    expect(find.text(esText.inboxTitle), findsOneWidget);
    expect(find.text('Factura emitida'), findsOneWidget);
  });

  testWidgets('the texts follow the app locale (en)', (tester) async {
    await tester.pumpWidget(routedApp(scope, locale: const Locale('en')));
    await tester.pumpAndSettle();

    expect(find.text(enText.inboxTitle), findsOneWidget);
    expect(find.text(enText.markAllRead), findsOneWidget);
  });

  testWidgets('the preferences action navigates to the nested route', (
    tester,
  ) async {
    await tester.pumpWidget(routedApp(scope));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip(esText.preferencesTooltip));
    await tester.pumpAndSettle();

    expect(find.text(esText.preferencesTitle), findsOneWidget);
    expect(find.byType(BackButton), findsOneWidget);
  });

  testWidgets('a deep link opens the preferences', (tester) async {
    await tester.pumpWidget(
      routedApp(scope, initialLocation: '/notifications/preferences'),
    );
    await tester.pumpAndSettle();

    expect(find.text(esText.preferencesTitle), findsOneWidget);
    expect(find.text(esText.quietHoursTitle), findsOneWidget);
  });

  testWidgets('the routes use the repository of the scope they get', (
    tester,
  ) async {
    scope.get<NotificationsRepository>(
      (_) => FakeNotificationsRepository(seed: const []),
    );
    await tester.pumpWidget(routedApp(scope));
    await tester.pumpAndSettle();

    expect(find.text(esText.emptyTitle), findsOneWidget);
  });
}
