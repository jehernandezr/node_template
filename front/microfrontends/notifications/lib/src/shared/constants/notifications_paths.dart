/// Routes of the notifications microfrontend.
abstract final class NotificationsPaths {
  /// Inbox. Root route of the microfrontend.
  static const String inbox = '/notifications';

  /// Relative segment of the preferences, child of [inbox].
  static const String preferencesSegment = 'preferences';

  /// Absolute route of the preferences.
  static const String preferences = '$inbox/$preferencesSegment';
}
