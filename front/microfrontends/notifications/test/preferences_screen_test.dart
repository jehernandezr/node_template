import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_notifications/src/screens/screens.dart';

import 'support/test_app.dart';

Future<void> _pumpPreferences(
  WidgetTester tester,
  NotificationsRepository repo,
) async {
  await tester.pumpWidget(
    testApp(NotificationsPreferencesScreen(repository: repo)),
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
  testWidgets('renders every type and channel with the saved values', (
    tester,
  ) async {
    final repo = FakeNotificationsRepository();
    addTearDown(repo.dispose);

    await _pumpPreferences(tester, repo);

    for (final type in NotificationType.values) {
      expect(find.text(esText.typeLabel(type)), findsOneWidget);
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
      saved.isEnabled(NotificationType.taskUpdated, NotificationChannel.email),
      isTrue,
    );
  });

  testWidgets('a failed save reverts the switch and shows a SnackBar', (
    tester,
  ) async {
    final repo = FakeNotificationsRepository()
      ..saveError = StateError('save failed');
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
    expect(find.text(esText.saveError), findsOneWidget);
  });

  testWidgets('security alerts are locked on for every channel', (
    tester,
  ) async {
    final repo = FakeNotificationsRepository();
    addTearDown(repo.dispose);

    await _pumpPreferences(tester, repo);

    for (final channel in NotificationChannel.values) {
      final control = _switch(tester, NotificationType.securityAlert, channel);
      expect(control.value, isTrue);
      expect(control.onChanged, isNull);
    }
    expect(find.text(esText.securityLocked), findsOneWidget);
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

  test('withChannel ignores mandatory combinations', () {
    final prefs = NotificationPreferences.defaults();
    final next = prefs.withChannel(
      NotificationType.securityAlert,
      NotificationChannel.email,
      false,
    );
    expect(next, same(prefs));
    expect(
      next.isEnabled(NotificationType.securityAlert, NotificationChannel.email),
      isTrue,
    );
  });
}
