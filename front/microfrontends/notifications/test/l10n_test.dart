import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import 'support/test_app.dart';

Set<String> _keysOf(String path) =>
    (jsonDecode(File(path).readAsStringSync()) as Map<String, dynamic>).keys
        .where((key) => !key.startsWith('@'))
        .toSet();

void main() {
  test('es and en declare the same keys', () {
    expect(
      _keysOf('lib/src/l10n/app_en.arb'),
      _keysOf('lib/src/l10n/app_es.arb'),
    );
  });

  test('the Spanish strings come from NotificationsLocalizations', () {
    expect(esText.inboxTitle, 'Notificaciones');
    expect(esText.markAllRead, 'Marcar todas como leídas');
    expect(esText.typeLabel(NotificationType.taskUpdated), 'Tareas');
    expect(esText.channelLabel(NotificationChannel.email), 'Correo');
  });

  test('the English strings come from NotificationsLocalizations', () {
    expect(enText.inboxTitle, 'Notifications');
    expect(enText.preferencesTitle, 'Notification preferences');
    expect(enText.markReadError, isNot(esText.markReadError));
  });

  test('every type and channel has a label in both languages', () {
    for (final text in [esText, enText]) {
      for (final type in NotificationType.values) {
        expect(text.typeLabel(type), isNotEmpty);
      }
      for (final channel in NotificationChannel.values) {
        expect(text.channelLabel(channel), isNotEmpty);
      }
    }
  });
}
