import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_notifications/src/data/fake_notifications_repository.dart';
import 'package:mf_notifications/src/data/notifications_repository.dart';
import 'package:shell_core/shell_core.dart';

import 'utils/notifications_scopes.dart';
import 'utils/notifications_test_app.dart';

void main() {
  late MicrofrontendScope scope;

  setUp(() {
    scope = NotificationsScopes.create();
    addTearDown(scope.dispose);
  });

  testWidgets('the inbox route shows the inbox in Spanish', (tester) async {
    await tester.pumpWidget(NotificationsTestApp.routed(scope));
    await tester.pumpAndSettle();

    expect(find.text(NotificationsTestApp.es.inboxTitle), findsOneWidget);
    expect(find.text('Factura emitida'), findsOneWidget);
  });

  testWidgets('the texts follow the app locale (en)', (tester) async {
    await tester.pumpWidget(
      NotificationsTestApp.routed(scope, locale: const Locale('en')),
    );
    await tester.pumpAndSettle();

    expect(find.text(NotificationsTestApp.en.inboxTitle), findsOneWidget);
    expect(find.text(NotificationsTestApp.en.markAllRead), findsOneWidget);
  });

  testWidgets('the preferences action navigates to the nested route', (
    tester,
  ) async {
    await tester.pumpWidget(NotificationsTestApp.routed(scope));
    await tester.pumpAndSettle();

    await tester.tap(
      find.byTooltip(NotificationsTestApp.es.preferencesTooltip),
    );
    await tester.pumpAndSettle();

    expect(find.text(NotificationsTestApp.es.preferencesTitle), findsOneWidget);
    expect(find.byType(BackButton), findsOneWidget);
  });

  testWidgets('a deep link opens the preferences', (tester) async {
    await tester.pumpWidget(
      NotificationsTestApp.routed(
        scope,
        initialLocation: '/notifications/preferences',
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text(NotificationsTestApp.es.preferencesTitle), findsOneWidget);
    expect(find.text(NotificationsTestApp.es.quietHoursTitle), findsOneWidget);
  });

  testWidgets('the routes use the repository of the scope they get', (
    tester,
  ) async {
    scope.get<NotificationsRepository>(
      (_) => FakeNotificationsRepository(seed: const []),
    );
    await tester.pumpWidget(NotificationsTestApp.routed(scope));
    await tester.pumpAndSettle();

    expect(find.text(NotificationsTestApp.es.emptyTitle), findsOneWidget);
  });
}
