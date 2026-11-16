import 'package:flutter_test/flutter_test.dart';
import 'package:mf_notifications/src/data/fake_notifications_repository.dart';
import 'package:mf_notifications/src/shared/types/types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/notification_fixtures.dart';

void main() {
  group(FakeNotificationsRepository, () {
    test('a scheduled failure hits only the operation it names', () async {
      final behavior = DemoBehavior()
        ..failNext(
          const FakeFailure(),
          operation: NotificationsOperation.markAsRead,
        );
      final repo = FakeNotificationsRepository(behavior: behavior);
      addTearDown(repo.dispose);

      await expectLater(repo.markAsRead('n-3'), throwsA(isA<FakeFailure>()));
      expect(await repo.fetchInbox(), hasLength(3));
    });

    test('a push goes first in the inbox and on the live stream', () async {
      final repo = FakeNotificationsRepository();
      addTearDown(repo.dispose);
      final arrivals = <AppNotification>[];
      final subscription = repo.live().listen(arrivals.add);
      addTearDown(subscription.cancel);

      repo.push(NotificationFixtures.item('x'));
      await pumpEventQueue();

      expect((await repo.fetchInbox()).first.id, 'x');
      expect(arrivals.map((n) => n.id), ['x']);
    });

    test('watchUnreadCount follows pushes and read marks', () async {
      final repo = FakeNotificationsRepository();
      addTearDown(repo.dispose);
      final counts = <int>[];
      final subscription = repo.watchUnreadCount().listen(counts.add);
      addTearDown(subscription.cancel);
      await pumpEventQueue();

      repo.push(NotificationFixtures.item('x'));
      await pumpEventQueue();
      await repo.markAsRead('x');
      await pumpEventQueue();

      expect(counts, [2, 3, 2]);
    });

    test('after dispose every call throws and pushes do nothing', () async {
      final repo = FakeNotificationsRepository();
      await repo.dispose();

      expect(repo.isDisposed, isTrue);
      await expectLater(
        repo.fetchInbox(),
        throwsA(isA<DemoDisposedException>()),
      );
      repo.push(NotificationFixtures.item('late'));
      expect(repo.isDisposed, isTrue);
    });

    test('disposing twice does not throw', () async {
      final repo = FakeNotificationsRepository();
      await repo.dispose();
      await expectLater(repo.dispose(), completes);
    });
  });
}
