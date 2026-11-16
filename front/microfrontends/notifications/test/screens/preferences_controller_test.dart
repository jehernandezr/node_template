import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mf_notifications/src/data/fake_notifications_repository.dart';
import 'package:mf_notifications/src/screens/preferences_controller.dart';
import 'package:mf_notifications/src/shared/types/types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/gated_notifications_repository.dart';

NotificationPreferences _loaded(PreferencesController controller) =>
    controller.preferences.valueOrNull!;

void main() {
  group(PreferencesController, () {
    test('start loads the default preferences', () async {
      final fake = FakeNotificationsRepository();
      final controller = PreferencesController(fake);
      addTearDown(fake.dispose);
      addTearDown(controller.dispose);

      await controller.start();

      final prefs = _loaded(controller);
      expect(
        prefs.isEnabled(NotificationType.taskUpdated, NotificationChannel.push),
        isTrue,
      );
      expect(
        prefs.isEnabled(
          NotificationType.taskUpdated,
          NotificationChannel.email,
        ),
        isFalse,
      );
      expect(prefs.quietStart, const ClockTime(22, 0));
    });

    test('a change shows at once and is saved when it succeeds', () async {
      final fake = FakeNotificationsRepository();
      final repo = GatedNotificationsRepository(fake);
      repo.saveGate = Completer<void>();
      final controller = PreferencesController(repo);
      addTearDown(fake.dispose);
      addTearDown(controller.dispose);
      await controller.start();

      final pending = controller.setChannel(
        NotificationType.taskUpdated,
        NotificationChannel.email,
        enabled: true,
      );
      expect(
        _loaded(controller)
            .isEnabled(NotificationType.taskUpdated, NotificationChannel.email),
        isTrue,
      );

      repo.saveGate!.complete();
      expect(await pending, isA<ActionSucceeded<void>>());
      final saved = await fake.fetchPreferences();
      expect(
        saved.isEnabled(
          NotificationType.taskUpdated,
          NotificationChannel.email,
        ),
        isTrue,
      );
    });

    test(
      'two changes are saved one by one, each with the whole state',
      () async {
        final fake = FakeNotificationsRepository();
        final repo = GatedNotificationsRepository(fake);
        final controller = PreferencesController(repo);
        addTearDown(fake.dispose);
        addTearDown(controller.dispose);
        await controller.start();

        final gate = Completer<void>();
        repo.saveGate = gate;
        final first = controller.setChannel(
          NotificationType.taskUpdated,
          NotificationChannel.email,
          enabled: true,
        );
        final second = controller.setChannel(
          NotificationType.accountActivity,
          NotificationChannel.push,
          enabled: true,
        );
        await pumpEventQueue();

        // The second save waits for the first one to end.
        expect(repo.saved, hasLength(1));

        gate.complete();
        await first;
        await second;

        expect(repo.saved, hasLength(2));
        expect(
          repo.saved[0].isEnabled(
            NotificationType.accountActivity,
            NotificationChannel.push,
          ),
          isFalse,
        );
        expect(
          repo.saved[1].isEnabled(
            NotificationType.taskUpdated,
            NotificationChannel.email,
          ),
          isTrue,
        );
        expect(
          repo.saved[1].isEnabled(
            NotificationType.accountActivity,
            NotificationChannel.push,
          ),
          isTrue,
        );
      },
    );

    test('a failed save with a newer change pending is skipped and the newer '
        'save keeps both changes', () async {
      final fake = FakeNotificationsRepository(
        behavior: DemoBehavior()
          ..failNext(
            const FakeFailure(),
            operation: NotificationsOperation.savePreferences,
          ),
      );
      final controller = PreferencesController(fake);
      addTearDown(fake.dispose);
      addTearDown(controller.dispose);
      await controller.start();

      final first = controller.setChannel(
        NotificationType.taskUpdated,
        NotificationChannel.email,
        enabled: true,
      );
      final second = controller.setChannel(
        NotificationType.accountActivity,
        NotificationChannel.push,
        enabled: true,
      );
      final firstResult = await first;
      final secondResult = await second;

      expect(firstResult, isA<ActionSkipped<void>>());
      expect(secondResult, isA<ActionSucceeded<void>>());
      final state = _loaded(controller);
      expect(
        state.isEnabled(
          NotificationType.taskUpdated,
          NotificationChannel.email,
        ),
        isTrue,
      );
      expect(
        state.isEnabled(
          NotificationType.accountActivity,
          NotificationChannel.push,
        ),
        isTrue,
      );
      final saved = await fake.fetchPreferences();
      expect(
        saved.isEnabled(
          NotificationType.taskUpdated,
          NotificationChannel.email,
        ),
        isTrue,
      );
      expect(
        saved.isEnabled(
          NotificationType.accountActivity,
          NotificationChannel.push,
        ),
        isTrue,
      );
    });

    test(
      'a single failed change returns to the last saved preferences',
      () async {
        final fake = FakeNotificationsRepository(
          behavior: DemoBehavior()
            ..failNext(
              const FakeFailure(),
              operation: NotificationsOperation.savePreferences,
            ),
        );
        final controller = PreferencesController(fake);
        addTearDown(fake.dispose);
        addTearDown(controller.dispose);
        await controller.start();

        final result = await controller.setChannel(
          NotificationType.taskUpdated,
          NotificationChannel.email,
          enabled: true,
        );

        expect(result, isA<ActionFailed<void>>());
        expect(
          _loaded(
            controller,
          ).isEnabled(NotificationType.taskUpdated, NotificationChannel.email),
          isFalse,
        );
        expect(
          _loaded(
            controller,
          ).isEnabled(NotificationType.taskUpdated, NotificationChannel.push),
          isTrue,
        );
      },
    );

    test(
      'a failed newest save returns to the change saved before it',
      () async {
        final behavior = DemoBehavior();
        final fake = FakeNotificationsRepository(behavior: behavior);
        final repo = GatedNotificationsRepository(fake);
        final controller = PreferencesController(repo);
        addTearDown(fake.dispose);
        addTearDown(controller.dispose);
        await controller.start();

        final firstGate = Completer<void>();
        repo.saveGate = firstGate;
        final first = controller.setChannel(
          NotificationType.taskUpdated,
          NotificationChannel.email,
          enabled: true,
        );
        final second = controller.setChannel(
          NotificationType.accountActivity,
          NotificationChannel.push,
          enabled: true,
        );
        await pumpEventQueue();
        // The second save starts after the first one ends, so it waits here.
        final secondGate = Completer<void>();
        repo.saveGate = secondGate;
        firstGate.complete();
        expect(await first, isA<ActionSucceeded<void>>());
        behavior.failNext(
          const FakeFailure(),
          operation: NotificationsOperation.savePreferences,
        );
        secondGate.complete();

        expect(await second, isA<ActionFailed<void>>());
        final state = _loaded(controller);
        expect(
          state.isEnabled(
            NotificationType.taskUpdated,
            NotificationChannel.email,
          ),
          isTrue,
        );
        expect(
          state.isEnabled(
            NotificationType.accountActivity,
            NotificationChannel.push,
          ),
          isFalse,
        );
      },
    );

    test('a mandatory combination is skipped and saves nothing', () async {
      final fake = FakeNotificationsRepository();
      final repo = GatedNotificationsRepository(fake);
      final controller = PreferencesController(repo);
      addTearDown(fake.dispose);
      addTearDown(controller.dispose);
      await controller.start();

      final result = await controller.setChannel(
        NotificationType.securityAlert,
        NotificationChannel.email,
        enabled: false,
      );

      expect(result, isA<ActionSkipped<void>>());
      expect(repo.saved, isEmpty);
    });

    test('quiet hours are saved', () async {
      final fake = FakeNotificationsRepository();
      final controller = PreferencesController(fake);
      addTearDown(fake.dispose);
      addTearDown(controller.dispose);
      await controller.start();

      await controller.setQuietStart(const ClockTime(23, 0));
      await controller.setQuietEnd(const ClockTime(6, 30));

      final saved = await fake.fetchPreferences();
      expect(saved.quietStart, const ClockTime(23, 0));
      expect(saved.quietEnd, const ClockTime(6, 30));
    });

    test('disposing during a save does not throw', () async {
      final fake = FakeNotificationsRepository();
      final repo = GatedNotificationsRepository(fake);
      repo.saveGate = Completer<void>();
      final controller = PreferencesController(repo);
      addTearDown(fake.dispose);
      await controller.start();

      final pending = controller.setChannel(
        NotificationType.taskUpdated,
        NotificationChannel.email,
        enabled: true,
      );
      controller.dispose();

      repo.saveGate!.complete();
      await expectLater(pending, completes);
    });
  });
}
