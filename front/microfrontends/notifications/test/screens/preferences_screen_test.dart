import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_notifications/src/data/fake_notifications_repository.dart';
import 'package:mf_notifications/src/data/notifications_repository.dart';
import 'package:mf_notifications/src/l10n/notification_labels.dart';
import 'package:mf_notifications/src/screens/screens.dart';
import 'package:mf_notifications/src/shared/types/types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/notifications_test_app.dart';

Future<void> _pumpPreferences(
  WidgetTester tester,
  NotificationsRepository repo,
) async {
  await NotificationsTestApp().pump(
    tester,
    NotificationsPreferencesScreen(repository: repo),
  );
  await tester.pumpAndSettle();
}

Switch _switch(
  WidgetTester tester,
  NotificationType type,
  NotificationChannel channel,
) => tester.widget<Switch>(
  find.byKey(ValueKey('pref-${type.name}-${channel.name}')),
);

void main() {
  group(NotificationsPreferencesScreen, () {
    testWidgets('renders every type and channel with the saved values', (
      tester,
    ) async {
      final repo = FakeNotificationsRepository();
      addTearDown(repo.dispose);

      await _pumpPreferences(tester, repo);

      for (final type in NotificationType.values) {
        expect(
          find.text(NotificationsTestApp.es.typeLabel(type)),
          findsOneWidget,
        );
      }
      expect(
        _switch(
          tester,
          NotificationType.taskUpdated,
          NotificationChannel.push,
        ).value,
        isTrue,
      );
      expect(
        _switch(
          tester,
          NotificationType.taskUpdated,
          NotificationChannel.email,
        ).value,
        isFalse,
      );
    });

    testWidgets('toggling a switch saves the new preference', (tester) async {
      final repo = FakeNotificationsRepository();
      addTearDown(repo.dispose);

      await _pumpPreferences(tester, repo);
      await tester.tap(find.byKey(const ValueKey('pref-taskUpdated-email')));
      await tester.pumpAndSettle();

      expect(
        _switch(
          tester,
          NotificationType.taskUpdated,
          NotificationChannel.email,
        ).value,
        isTrue,
      );
      final saved = await repo.fetchPreferences();
      expect(
        saved.isEnabled(
          NotificationType.taskUpdated,
          NotificationChannel.email,
        ),
        isTrue,
      );
    });

    testWidgets('a failed save reverts the switch and shows a SnackBar', (
      tester,
    ) async {
      final repo = FakeNotificationsRepository(
        behavior: DemoBehavior()
          ..failNext(
            Exception('save failed'),
            operation: NotificationsOperation.savePreferences,
          ),
      );
      addTearDown(repo.dispose);

      await _pumpPreferences(tester, repo);
      await tester.tap(find.byKey(const ValueKey('pref-taskUpdated-email')));
      await tester.pumpAndSettle();

      expect(
        _switch(
          tester,
          NotificationType.taskUpdated,
          NotificationChannel.email,
        ).value,
        isFalse,
      );
      expect(find.byType(SnackBar), findsOneWidget);
      expect(find.text(NotificationsTestApp.es.saveError), findsOneWidget);
    });

    testWidgets('security alerts are locked on for every channel', (
      tester,
    ) async {
      final repo = FakeNotificationsRepository();
      addTearDown(repo.dispose);

      await _pumpPreferences(tester, repo);

      for (final channel in NotificationChannel.values) {
        final control = _switch(
          tester,
          NotificationType.securityAlert,
          channel,
        );
        expect(control.value, isTrue);
        expect(control.onChanged, isNull);
      }
      expect(find.text(NotificationsTestApp.es.securityLocked), findsOneWidget);
    });

    testWidgets('shows quiet hours start and end', (tester) async {
      final repo = FakeNotificationsRepository();
      addTearDown(repo.dispose);

      await _pumpPreferences(tester, repo);

      expect(find.byKey(const ValueKey('quiet-start')), findsOneWidget);
      expect(find.byKey(const ValueKey('quiet-end')), findsOneWidget);
      expect(find.text('22:00'), findsOneWidget);
      expect(find.text('07:00'), findsOneWidget);
    });

    testWidgets('meets the accessibility guidelines', (tester) async {
      final repo = FakeNotificationsRepository();
      addTearDown(repo.dispose);

      await _pumpPreferences(tester, repo);
      await expectAccessible(tester);
    });

    testWidgets('each switch is announced with its type and channel', (
      tester,
    ) async {
      final repo = FakeNotificationsRepository();
      addTearDown(repo.dispose);
      final handle = tester.ensureSemantics();
      try {
        await _pumpPreferences(tester, repo);

        final l10n = NotificationsTestApp.es;
        final label = l10n.preferenceSwitchLabel(
          l10n.typeLabel(NotificationType.invoiceIssued),
          l10n.channelLabel(NotificationChannel.email),
        );
        expect(
          tester.getSemantics(
            find.byKey(
              ValueKey(
                'pref-${NotificationType.invoiceIssued.name}-'
                '${NotificationChannel.email.name}',
              ),
            ),
          ),
          matchesSemantics(
            label: label,
            hasToggledState: true,
            isToggled: true,
            hasEnabledState: true,
            isEnabled: true,
            isFocusable: true,
            hasTapAction: true,
            hasFocusAction: true,
          ),
        );
      } finally {
        handle.dispose();
      }
    });
  });
}
