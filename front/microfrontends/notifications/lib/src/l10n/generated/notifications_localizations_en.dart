// ignore_for_file: deprecated_member_use

// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'notifications_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class NotificationsLocalizationsEn extends NotificationsLocalizations {
  NotificationsLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get inboxTitle => 'Notifications';

  @override
  String get preferencesTitle => 'Notification preferences';

  @override
  String get preferencesTooltip => 'Preferences';

  @override
  String get markAllRead => 'Mark all as read';

  @override
  String get unreadLabel => 'Unread';

  @override
  String get readLabel => 'Read';

  @override
  String get emptyTitle => 'You have no notifications';

  @override
  String get emptyMessage => 'Account notices will appear here.';

  @override
  String get loadError => 'We couldn\'t load your notifications.';

  @override
  String get saveError => 'We couldn\'t save your preferences.';

  @override
  String get markReadError => 'We couldn\'t mark your notifications as read.';

  @override
  String get typeHeader => 'Type';

  @override
  String get typeSecurityAlert => 'Security alerts';

  @override
  String get typeTaskUpdated => 'Tasks';

  @override
  String get typeInvoiceIssued => 'Invoices';

  @override
  String get typeAccountActivity => 'Account activity';

  @override
  String get channelInApp => 'In app';

  @override
  String get channelPush => 'Push';

  @override
  String get channelEmail => 'Email';

  @override
  String get securityLocked =>
      'Security alerts always arrive on every channel.';

  @override
  String get quietHoursTitle => 'Quiet hours';

  @override
  String get quietHoursStart => 'Start';

  @override
  String get quietHoursEnd => 'End';

  @override
  String get quietHoursStartPicker => 'Start time';

  @override
  String get quietHoursEndPicker => 'End time';
}
