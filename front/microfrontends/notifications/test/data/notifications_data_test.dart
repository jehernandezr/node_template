import 'package:flutter_test/flutter_test.dart';
import 'package:mf_notifications/mf_notifications.dart';
import 'package:mf_notifications/src/data/api_notifications_repository.dart';
import 'package:mf_notifications/src/data/fake_notifications_repository.dart';
import 'package:mf_notifications/src/data/notifications_data.dart';
import 'package:mf_notifications/src/data/notifications_repository.dart';
import 'package:mf_notifications/src/screens/screens.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/notification_fixtures.dart';
import '../utils/notifications_scopes.dart';
import '../utils/notifications_test_app.dart';

void main() {
  group(NotificationsData, () {
    testWidgets(
      'marking all read on the screen emits UnreadCountChanged(0) through the lifecycle',
      (tester) async {
        final bus = ShellEventBus();
        addTearDown(bus.dispose);
        final scope = NotificationsScopes.create(bus: bus);
        addTearDown(scope.dispose);
        final repo = scope.get<NotificationsRepository>(
          (_) => FakeNotificationsRepository(
            seed: [
              NotificationFixtures.item('a'),
              NotificationFixtures.item('b'),
            ],
          ),
        ) as FakeNotificationsRepository;

        final counts = <int>[];
        final subscription = bus.on<UnreadCountChanged>().listen(
          (e) => counts.add(e.count),
        );
        addTearDown(subscription.cancel);

        final lifecycle = NotificationsLifecycle();
        addTearDown(lifecycle.dispose);
        final initialized = lifecycle.initialize(
          ShellContext(
            eventBus: bus,
            session: UserSession.anonymous,
            scope: scope,
          ),
        );
        await NotificationsTestApp().pump(
          tester,
          NotificationsScreens.inbox(scope),
        );
        await tester.pumpAndSettle();
        await initialized;
        await tester.pump();
        expect(counts, [2]);

        await tester.tap(find.text(NotificationsTestApp.es.markAllRead));
        await tester.pumpAndSettle();
        expect(counts, [2, 0]);
        expect(
          identical(scope.repository(NotificationsData.repository), repo),
          isTrue,
        );
      },
    );

    test('a fresh scope does not see the data of another one', () async {
      final first = NotificationsScopes.create();
      final second = NotificationsScopes.create();
      addTearDown(first.dispose);
      addTearDown(second.dispose);
      final firstRepo = first.repository(NotificationsData.repository);
      final secondRepo = second.repository(NotificationsData.repository);

      await firstRepo.markAllAsRead();

      expect(await firstRepo.unreadCount(), 0);
      expect(await secondRepo.unreadCount(), 2);
      expect(identical(firstRepo, secondRepo), isFalse);
    });

    group('disposing the scope', () {
      test('closes the repository without a dispose callback', () async {
        final scope = NotificationsScopes.create();
        final repo = scope.repository(
          NotificationsData.repository,
        ) as FakeNotificationsRepository;
        expect(repo, isA<ScopedResource>());
        expect(repo.isDisposed, isFalse);

        await scope.dispose();

        expect(repo.isDisposed, isTrue);
        expect(
          () => scope.repository(NotificationsData.repository),
          throwsStateError,
        );
      });

      test('ends the live and unread streams', () async {
        final scope = NotificationsScopes.create();
        final repo = scope.repository(NotificationsData.repository);
        final counts = <int>[];
        var countsDone = false;
        var liveDone = false;
        repo.watchUnreadCount().listen(
          counts.add,
          onDone: () => countsDone = true,
        );
        repo.live().listen((_) {}, onDone: () => liveDone = true);
        await Future<void>.delayed(Duration.zero);
        expect(counts, [2]);

        await scope.dispose();
        await Future<void>.delayed(Duration.zero);

        expect(countsDone, isTrue);
        expect(liveDone, isTrue);
        expect(counts, [2]);
      });
    });

    test('a live scope reads the inbox from the API', () async {
      final transport = ScriptedTransport()
        ..json(200, {
          'items': [NotificationFixtures.json(1)],
          'nextCursor': null,
        });
      final scope = ScriptedApi.liveScope(transport);
      addTearDown(scope.dispose);

      final repository = scope.repository(NotificationsData.repository);
      final inbox = await repository.fetchInbox();

      expect(repository, isA<ApiNotificationsRepository>());
      expect(inbox.single.id, NotificationFixtures.id(1));
    });
  });
}
