import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

import 'package:mf_notifications/src/l10n/notification_labels.dart';
import 'package:mf_notifications/src/shared/enums/notification_enums.dart';

import '../utils/notifications_test_app.dart';

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
    expect(NotificationsTestApp.es.inboxTitle, 'Notificaciones');
    expect(NotificationsTestApp.es.markAllRead, 'Marcar todas como leídas');
    expect(
      NotificationsTestApp.es.typeLabel(NotificationType.taskUpdated),
      'Tareas',
    );
    expect(
      NotificationsTestApp.es.channelLabel(NotificationChannel.email),
      'Correo',
    );
  });

  test('the English strings come from NotificationsLocalizations', () {
    expect(NotificationsTestApp.en.inboxTitle, 'Notifications');
    expect(
      NotificationsTestApp.en.preferencesTitle,
      'Notification preferences',
    );
    expect(
      NotificationsTestApp.en.markReadError,
      isNot(NotificationsTestApp.es.markReadError),
    );
  });

  test('every type and channel has a label in both languages', () {
    for (final text in [NotificationsTestApp.es, NotificationsTestApp.en]) {
      for (final type in NotificationType.values) {
        expect(text.typeLabel(type), isNotEmpty);
      }
      for (final channel in NotificationChannel.values) {
        expect(text.channelLabel(channel), isNotEmpty);
      }
    }
  });
}
