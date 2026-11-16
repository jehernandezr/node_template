import 'package:flutter_test/flutter_test.dart';
import 'package:mf_notifications/src/shared/types/types.dart';

void main() {
  group(NotificationPreferences, () {
    test('withChannel ignores mandatory combinations', () {
      final prefs = NotificationPreferences.defaults();
      final next = prefs.withChannel(
        NotificationType.securityAlert,
        NotificationChannel.email,
        false,
      );
      expect(next, same(prefs));
      expect(
        next.isEnabled(
          NotificationType.securityAlert,
          NotificationChannel.email,
        ),
        isTrue,
      );
    });
  });
}
