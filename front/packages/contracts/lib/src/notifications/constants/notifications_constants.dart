// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen

/// `NotificationsLimits` constants of the `notifications` contract.
abstract final class NotificationsLimits {
  static const int titleMaxLength = 200;
  static const int bodyMaxLength = 1000;
  static const String quietTimePattern = '^([01]\\d|2[0-3]):[0-5]\\d\$';
  static const int timezoneMaxLength = 64;
  static const int maxChannels = 3;
  static const int maxTypes = 4;
  static const int maxParameters = 10;
  static const int parameterValueMaxLength = 512;
  static const int recipientMaxLength = 254;
  static const int localeMaxLength = 35;
}

/// `NotificationPolicy` constants of the `notifications` contract.
abstract final class NotificationPolicy {
  static const List<String> mandatoryTypes = ['security_alert'];
}
