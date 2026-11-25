/// Time of day without date or zone, such as 22:00 for the start of the
/// quiet hours.
final class ClockTime {
  const ClockTime(this.hour, this.minute)
    : assert(hour >= 0 && hour < 24),
      assert(minute >= 0 && minute < 60);

  /// Reads `HH:mm`, the format of the contract.
  ///
  /// Throws [FormatException] when [text] is not a valid time of day.
  factory ClockTime.parse(String text) {
    final match = _pattern.firstMatch(text);
    if (match == null) throw FormatException('Invalid time of day', text);
    return ClockTime(int.parse(match[1]!), int.parse(match[2]!));
  }

  static final RegExp _pattern = RegExp(r'^([01]\d|2[0-3]):([0-5]\d)$');

  final int hour;
  final int minute;

  @override
  bool operator ==(Object other) =>
      other is ClockTime && other.hour == hour && other.minute == minute;

  @override
  int get hashCode => Object.hash(hour, minute);

  @override
  String toString() =>
      '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}';
}
