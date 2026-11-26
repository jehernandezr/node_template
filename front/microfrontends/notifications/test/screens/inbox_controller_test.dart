import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mf_notifications/src/data/fake_notifications_repository.dart';
import 'package:mf_notifications/src/screens/inbox_controller.dart';
import 'package:mf_notifications/src/shared/types/types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/gated_notifications_repository.dart';
import '../utils/notification_fixtures.dart';

List<AppNotification> _items(InboxController controller) =>
    controller.inbox.valueOrNull ?? const [];

void main() {
  group(InboxController, () {
    test('start loads the inbox and counts the unread', () async {
      final fake = FakeNotificationsRepository();
      final controller = InboxController(fake);
      addTearDown(fake.dispose);
      addTearDown(controller.dispose);

      await controller.start();

      expect(_items(controller), hasLength(3));
      expect(controller.unreadCount, 2);
    });

    test('two loads in a row merge into one list without repeats', () async {
      final fake = FakeNotificationsRepository();
      final repo = GatedNotificationsRepository(fake);
      repo.fetchGate = Completer<void>();
      final controller = InboxController(repo);
      addTearDown(fake.dispose);
      addTearDown(controller.dispose);

      final first = controller.start();
      final second = controller.start();
      repo.fetchGate!.complete();
      await Future.wait([first, second]);

      final ids = _items(controller).map((n) => n.id).toList();
      expect(ids, hasLength(3));
      expect(ids.toSet(), hasLength(3));
    });

    test('the answer of an older load never replaces a newer one', () async {
      final fake = FakeNotificationsRepository();
      final repo = GatedNotificationsRepository(fake);
      final controller = InboxController(repo);
      addTearDown(fake.dispose);
      addTearDown(controller.dispose);

      final firstGate = Completer<void>();
      repo.fetchGate = firstGate;
      final first = controller.start();
      final secondGate = Completer<void>();
      repo.fetchGate = secondGate;
      final second = controller.start();
      secondGate.complete();
      await second;

      await fake.markAsRead('n-3');
      firstGate.complete();
      await first;

      expect(_items(controller).firstWhere((n) => n.id == 'n-3').read, isFalse);
      expect(controller.unreadCount, 2);
    });

    test('an arrival during the first load appears once, first', () async {
      final fake = FakeNotificationsRepository();
      final repo = GatedNotificationsRepository(fake);
      repo.fetchGate = Completer<void>();
      final controller = InboxController(repo);
      addTearDown(fake.dispose);
      addTearDown(controller.dispose);

      final loading = controller.start();
      repo.push(NotificationFixtures.item('z'));
      await pumpEventQueue();
      repo.fetchGate!.complete();
      await loading;

      final ids = _items(controller).map((n) => n.id).toList();
      expect(ids.where((id) => id == 'z'), hasLength(1));
      expect(ids.first, 'z');
    });

    test('an arrival after the load goes first and counts as unread', () async {
      final fake = FakeNotificationsRepository();
      final controller = InboxController(fake);
      addTearDown(fake.dispose);
      addTearDown(controller.dispose);
      await controller.start();

      fake.push(NotificationFixtures.item('z'));
      await pumpEventQueue();

      expect(_items(controller).first.id, 'z');
      expect(controller.unreadCount, 3);
    });

    test('markRead marks one item and skips the rest', () async {
      final fake = FakeNotificationsRepository();
      final controller = InboxController(fake);
      addTearDown(fake.dispose);
      addTearDown(controller.dispose);
      await controller.start();

      final result = await controller.markRead('n-3');

      expect(result, isA<ActionSucceeded<void>>());
      expect(_items(controller).firstWhere((n) => n.id == 'n-3').read, isTrue);
      expect(controller.unreadCount, 1);

      final before = _items(controller);
      expect(await controller.markRead('n-2'), isA<ActionSkipped<void>>());
      expect(await controller.markRead('nope'), isA<ActionSkipped<void>>());
      expect(_items(controller), before);
    });

    test('a failed markRead reverts only its item and keeps an arrival '
        'that came in while saving', () async {
      final fake = FakeNotificationsRepository(
        behavior: DemoBehavior()
          ..failNext(
            const FakeFailure(),
            operation: NotificationsOperation.markAsRead,
          ),
      );
      final repo = GatedNotificationsRepository(fake);
      repo.markGate = Completer<void>();
      final controller = InboxController(repo);
      addTearDown(fake.dispose);
      addTearDown(controller.dispose);
      await controller.start();

      final save = controller.markRead('n-3');
      expect(_items(controller).firstWhere((n) => n.id == 'n-3').read, isTrue);
      repo.push(NotificationFixtures.item('z'));
      await pumpEventQueue();
      repo.markGate!.complete();
      final result = await save;

      expect(result, isA<ActionFailed<void>>());
      final items = _items(controller);
      expect(items.first.id, 'z');
      expect(items.firstWhere((n) => n.id == 'n-3').read, isFalse);
      expect(items.firstWhere((n) => n.id == 'n-2').read, isTrue);
      expect(items, hasLength(4));
    });

    test('a failed markAllRead reverts every item it had marked', () async {
      final fake = FakeNotificationsRepository(
        behavior: DemoBehavior()
          ..failNext(
            const FakeFailure(),
            operation: NotificationsOperation.markAllAsRead,
          ),
      );
      final controller = InboxController(fake);
      addTearDown(fake.dispose);
      addTearDown(controller.dispose);
      await controller.start();

      final result = await controller.markAllRead();

      expect(result, isA<ActionFailed<void>>());
      final items = _items(controller);
      expect(items.firstWhere((n) => n.id == 'n-3').read, isFalse);
      expect(items.firstWhere((n) => n.id == 'n-1').read, isFalse);
      expect(items.firstWhere((n) => n.id == 'n-2').read, isTrue);
    });

    test(
      'disposing during a load notifies nothing and does not throw',
      () async {
        final fake = FakeNotificationsRepository();
        final repo = GatedNotificationsRepository(fake);
        repo.fetchGate = Completer<void>();
        final controller = InboxController(repo);
        addTearDown(fake.dispose);

        var notifications = 0;
        controller.addListener(() => notifications++);
        final loading = controller.start();
        controller.dispose();
        final notifiedAtDispose = notifications;

        repo.fetchGate!.complete();
        await expectLater(loading, completes);
        expect(notifications, notifiedAtDispose);
      },
    );
  });
}
