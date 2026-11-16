import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_notifications/src/data/fake_notifications_repository.dart';
import 'package:mf_notifications/src/data/notifications_repository.dart';
import 'package:mf_notifications/src/screens/screens.dart';
import 'package:mf_notifications/src/shared/types/types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/notification_fixtures.dart';
import '../utils/notifications_test_app.dart';

Future<void> _pumpInbox(WidgetTester tester, NotificationsRepository repo) =>
    NotificationsTestApp().pump(
      tester,
      NotificationsInboxScreen(repository: repo),
    );

void main() {
  group(NotificationsInboxScreen, () {
    testWidgets('shows a loading indicator while the inbox loads', (
      tester,
    ) async {
      final repo = FakeNotificationsRepository(
        seed: [NotificationFixtures.item('a')],
        behavior: DemoBehavior(delay: const Duration(milliseconds: 100)),
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
        seed: [
          NotificationFixtures.item('a'),
          NotificationFixtures.item('b', read: true),
        ],
      );
      addTearDown(repo.dispose);

      await _pumpInbox(tester, repo);
      await tester.pumpAndSettle();

      expect(find.text('Título a'), findsOneWidget);
      expect(find.text('Título b'), findsOneWidget);
      expect(find.text(NotificationsTestApp.es.unreadLabel), findsOneWidget);
      expect(find.text(NotificationsTestApp.es.readLabel), findsOneWidget);
    });

    testWidgets('shows the empty state when there are no notifications', (
      tester,
    ) async {
      final repo = FakeNotificationsRepository(seed: const []);
      addTearDown(repo.dispose);

      await _pumpInbox(tester, repo);
      await tester.pumpAndSettle();

      expect(find.text(NotificationsTestApp.es.emptyTitle), findsOneWidget);
      expect(find.byType(ListTile), findsNothing);
    });

    testWidgets('shows an error with retry when loading fails', (tester) async {
      final repo = FakeNotificationsRepository(
        seed: [NotificationFixtures.item('a')],
        behavior: DemoBehavior()
          ..failNext(
            Exception('boom'),
            operation: NotificationsOperation.fetchInbox,
          ),
      );
      addTearDown(repo.dispose);

      await _pumpInbox(tester, repo);
      await tester.pumpAndSettle();
      expect(find.text(NotificationsTestApp.es.loadError), findsOneWidget);

      await tester.tap(find.text('Reintentar'));
      await tester.pumpAndSettle();
      expect(find.text('Título a'), findsOneWidget);
    });

    testWidgets('a live notification appears at the top', (tester) async {
      final repo = FakeNotificationsRepository(
        seed: [NotificationFixtures.item('a')],
      );
      addTearDown(repo.dispose);

      await _pumpInbox(tester, repo);
      await tester.pumpAndSettle();

      repo.push(NotificationFixtures.item('live'));
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
      final repo = FakeNotificationsRepository(
        seed: [NotificationFixtures.item('a')],
      );
      addTearDown(repo.dispose);

      await _pumpInbox(tester, repo);
      await tester.pumpAndSettle();

      await tester.tap(find.text('Título a'));
      await tester.pumpAndSettle();

      expect(find.text(NotificationsTestApp.es.readLabel), findsOneWidget);
      expect(await repo.unreadCount(), 0);
    });

    testWidgets('mark all as read clears every unread item', (tester) async {
      final repo = FakeNotificationsRepository(
        seed: [NotificationFixtures.item('a'), NotificationFixtures.item('b')],
      );
      addTearDown(repo.dispose);

      await _pumpInbox(tester, repo);
      await tester.pumpAndSettle();
      expect(find.text(NotificationsTestApp.es.unreadLabel), findsNWidgets(2));

      await tester.tap(find.text(NotificationsTestApp.es.markAllRead));
      await tester.pumpAndSettle();

      expect(find.text(NotificationsTestApp.es.unreadLabel), findsNothing);
      expect(find.text(NotificationsTestApp.es.readLabel), findsNWidgets(2));
      expect(await repo.unreadCount(), 0);
    });

    testWidgets('error labels come from AppLocalizations in en', (
      tester,
    ) async {
      final en = NotificationsTestApp.en;
      final repo = FakeNotificationsRepository(
        seed: [NotificationFixtures.item('a')],
        behavior: DemoBehavior()
          ..failNext(
            ApiErrorException(
              const ProblemDetails(
                type: 'about:blank',
                title: 'Internal',
                status: 500,
                code: 'PLATFORM.INTERNAL.UNEXPECTED',
                traceId: 'trace-1',
              ),
            ),
            operation: NotificationsOperation.fetchInbox,
          ),
      );
      addTearDown(repo.dispose);

      await NotificationsTestApp(locale: const Locale('en'))
          .pump(tester, NotificationsInboxScreen(repository: repo));
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
      final repo = FakeNotificationsRepository(
        seed: [NotificationFixtures.item('a')],
      );
      addTearDown(repo.dispose);

      await _pumpInbox(tester, repo);
      await tester.pumpAndSettle();

      expect(find.byType(AppBar), findsOneWidget);
      expect(
        find.descendant(
          of: find.byType(AppBar),
          matching: find.text(NotificationsTestApp.es.inboxTitle),
        ),
        findsOneWidget,
      );
    });

    testWidgets(
      'a failed mark as read reverts only the tapped item and shows the '
      'action error',
      (tester) async {
        final repo = FakeNotificationsRepository(
          seed: [
            NotificationFixtures.item('a'),
            NotificationFixtures.item('b'),
          ],
          behavior: DemoBehavior()
            ..failNext(
              Exception('offline'),
              operation: NotificationsOperation.markAsRead,
            ),
        );
        addTearDown(repo.dispose);

        await _pumpInbox(tester, repo);
        await tester.pumpAndSettle();

        await tester.tap(find.text('Título a'));
        await tester.pumpAndSettle();

        expect(
          find.text(NotificationsTestApp.es.unreadLabel),
          findsNWidgets(2),
        );
        expect(find.byType(SnackBar), findsOneWidget);
        expect(
          find.text(NotificationsTestApp.es.markReadError),
          findsOneWidget,
        );
        expect(find.textContaining('offline'), findsNothing);
      },
    );

    testWidgets('an action that fails after the screen closed shows nothing', (
      tester,
    ) async {
      final behavior = DemoBehavior(delay: const Duration(milliseconds: 50));
      final repo = FakeNotificationsRepository(
        seed: [NotificationFixtures.item('a')],
        behavior: behavior,
      );
      addTearDown(repo.dispose);

      final showScreen = ValueNotifier(true);
      addTearDown(showScreen.dispose);
      await NotificationsTestApp().pump(
        tester,
        ValueListenableBuilder<bool>(
          valueListenable: showScreen,
          builder: (context, show, _) => show
              ? NotificationsInboxScreen(repository: repo)
              : const SizedBox(),
        ),
      );
      await tester.pump(const Duration(milliseconds: 60));
      expect(find.text('Título a'), findsOneWidget);

      behavior.failNext(
        Exception('offline'),
        operation: NotificationsOperation.markAsRead,
      );
      await tester.tap(find.text('Título a'));
      // Another identity replaces the screen before the error arrives.
      showScreen.value = false;
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await tester.pumpAndSettle();

      expect(find.byType(SnackBar), findsNothing);
    });

    testWidgets('meets the accessibility guidelines', (tester) async {
      final repo = FakeNotificationsRepository(
        seed: [NotificationFixtures.item('a')],
      );
      addTearDown(repo.dispose);

      await _pumpInbox(tester, repo);
      await tester.pumpAndSettle();
      await expectAccessible(tester);
    });
  });
}
