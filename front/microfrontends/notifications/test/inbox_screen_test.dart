import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_notifications/src/l10n/generated/notifications_localizations.dart';
import 'package:mf_notifications/src/screens/screens.dart';

import 'support/test_app.dart';

AppNotification _item(String id, {bool read = false}) => AppNotification(
  id: id,
  type: NotificationType.taskUpdated,
  title: 'Título $id',
  body: 'Cuerpo $id',
  createdAt: DateTime(2026, 11, 10),
  read: read,
);

Future<void> _pumpInbox(
  WidgetTester tester,
  FakeNotificationsRepository repo,
) => tester.pumpWidget(testApp(NotificationsInboxScreen(repository: repo)));

void main() {
  testWidgets('shows a loading indicator while the inbox loads', (
    tester,
  ) async {
    final repo = FakeNotificationsRepository(
      seed: [_item('a')],
      latency: const Duration(milliseconds: 100),
    );
    addTearDown(repo.dispose);

    await _pumpInbox(tester, repo);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    await tester.pump(const Duration(milliseconds: 200));
    await tester.pumpAndSettle();
    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(find.text('Título a'), findsOneWidget);
  });

  testWidgets('shows the inbox items with read state', (tester) async {
    final repo = FakeNotificationsRepository(
      seed: [_item('a'), _item('b', read: true)],
    );
    addTearDown(repo.dispose);

    await _pumpInbox(tester, repo);
    await tester.pumpAndSettle();

    expect(find.text('Título a'), findsOneWidget);
    expect(find.text('Título b'), findsOneWidget);
    expect(find.text(esText.unreadLabel), findsOneWidget);
    expect(find.text(esText.readLabel), findsOneWidget);
  });

  testWidgets('shows the empty state when there are no notifications', (
    tester,
  ) async {
    final repo = FakeNotificationsRepository(seed: const []);
    addTearDown(repo.dispose);

    await _pumpInbox(tester, repo);
    await tester.pumpAndSettle();

    expect(find.text(esText.emptyTitle), findsOneWidget);
    expect(find.byType(ListTile), findsNothing);
  });

  testWidgets('shows an error with retry when loading fails', (tester) async {
    final repo = FakeNotificationsRepository(seed: [_item('a')])
      ..fetchError = StateError('boom');
    addTearDown(repo.dispose);

    await _pumpInbox(tester, repo);
    await tester.pumpAndSettle();
    expect(find.text(esText.loadError), findsOneWidget);

    repo.fetchError = null;
    await tester.tap(find.text('Reintentar'));
    await tester.pumpAndSettle();
    expect(find.text('Título a'), findsOneWidget);
  });

  testWidgets('a live notification appears at the top', (tester) async {
    final repo = FakeNotificationsRepository(seed: [_item('a')]);
    addTearDown(repo.dispose);

    await _pumpInbox(tester, repo);
    await tester.pumpAndSettle();

    repo.push(_item('live'));
    await tester.pump();
    await tester.pump();

    final tiles = tester.widgetList<ListTile>(find.byType(ListTile)).toList();
    expect(tiles.length, 2);
    expect(find.text('Título live'), findsOneWidget);
    expect(
      tester.getTopLeft(find.text('Título live')).dy,
      lessThan(tester.getTopLeft(find.text('Título a')).dy),
    );
  });

  testWidgets('tapping an unread item marks it as read', (tester) async {
    final repo = FakeNotificationsRepository(seed: [_item('a')]);
    addTearDown(repo.dispose);

    await _pumpInbox(tester, repo);
    await tester.pumpAndSettle();

    await tester.tap(find.text('Título a'));
    await tester.pumpAndSettle();

    expect(find.text(esText.readLabel), findsOneWidget);
    expect(await repo.unreadCount(), 0);
  });

  testWidgets('mark all as read clears every unread item', (tester) async {
    final repo = FakeNotificationsRepository(seed: [_item('a'), _item('b')]);
    addTearDown(repo.dispose);

    await _pumpInbox(tester, repo);
    await tester.pumpAndSettle();
    expect(find.text(esText.unreadLabel), findsNWidgets(2));

    await tester.tap(find.text(esText.markAllRead));
    await tester.pumpAndSettle();

    expect(find.text(esText.unreadLabel), findsNothing);
    expect(find.text(esText.readLabel), findsNWidgets(2));
    expect(await repo.unreadCount(), 0);
  });
  testWidgets('error labels come from AppLocalizations in en', (tester) async {
    final en = lookupNotificationsLocalizations(const Locale('en'));
    final repo = FakeNotificationsRepository(seed: [_item('a')])
      ..fetchError = ApiErrorException(
        const ProblemDetails(
          type: 'about:blank',
          title: 'Internal',
          status: 500,
          code: 'PLATFORM.INTERNAL.UNEXPECTED',
          traceId: 'trace-1',
        ),
      );
    addTearDown(repo.dispose);

    await tester.pumpWidget(
      testApp(
        NotificationsInboxScreen(repository: repo),
        locale: const Locale('en'),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text(en.loadError), findsOneWidget);
    expect(
      find.textContaining('Code: PLATFORM.INTERNAL.UNEXPECTED'),
      findsOneWidget,
    );
    expect(find.textContaining('Trace ID: trace-1'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
  });

  testWidgets('the screen owns the only top bar', (tester) async {
    final repo = FakeNotificationsRepository(seed: [_item('a')]);
    addTearDown(repo.dispose);

    await _pumpInbox(tester, repo);
    await tester.pumpAndSettle();

    expect(find.byType(AppBar), findsOneWidget);
    expect(
      find.descendant(
        of: find.byType(AppBar),
        matching: find.text(esText.inboxTitle),
      ),
      findsOneWidget,
    );
  });

  testWidgets('a failed mark as read reverts and shows the action error', (
    tester,
  ) async {
    final repo = FakeNotificationsRepository(seed: [_item('a'), _item('b')])
      ..markError = StateError('offline');
    addTearDown(repo.dispose);

    await _pumpInbox(tester, repo);
    await tester.pumpAndSettle();

    await tester.tap(find.text(esText.markAllRead));
    await tester.pumpAndSettle();

    expect(find.text(esText.unreadLabel), findsNWidgets(2));
    expect(find.byType(SnackBar), findsOneWidget);
    expect(find.text(esText.markReadError), findsOneWidget);
    expect(find.textContaining('offline'), findsNothing);
  });

  testWidgets('an action that fails after the screen closed shows nothing', (
    tester,
  ) async {
    final repo = FakeNotificationsRepository(
      seed: [_item('a')],
      latency: const Duration(milliseconds: 50),
    );
    addTearDown(repo.dispose);

    final showScreen = ValueNotifier(true);
    addTearDown(showScreen.dispose);
    await tester.pumpWidget(
      testApp(
        ValueListenableBuilder<bool>(
          valueListenable: showScreen,
          builder: (context, show, _) => show
              ? NotificationsInboxScreen(repository: repo)
              : const SizedBox(),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 60));
    expect(find.text('Título a'), findsOneWidget);

    repo.markError = StateError('offline');
    await tester.tap(find.text('Título a'));
    // Otra identidad reemplaza la pantalla antes de que llegue el error.
    showScreen.value = false;
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pumpAndSettle();

    expect(find.byType(SnackBar), findsNothing);
  });
}
