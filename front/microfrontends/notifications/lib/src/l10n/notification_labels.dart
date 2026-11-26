import '../shared/enums/notification_enums.dart';
import 'generated/notifications_localizations.dart';

/// Localized names of the notification types and channels.
extension NotificationLabels on NotificationsLocalizations {
  /// Label of a notification type in the user's language.
  String typeLabel(NotificationType type) => switch (type) {
    NotificationType.securityAlert => typeSecurityAlert,
    NotificationType.taskUpdated => typeTaskUpdated,
    NotificationType.invoiceIssued => typeInvoiceIssued,
    NotificationType.accountActivity => typeAccountActivity,
  };

  /// Label of a channel in the user's language.
  String channelLabel(NotificationChannel channel) => switch (channel) {
    NotificationChannel.inApp => channelInApp,
    NotificationChannel.push => channelPush,
    NotificationChannel.email => channelEmail,
  };
}
