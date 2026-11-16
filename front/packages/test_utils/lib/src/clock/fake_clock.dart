/// Clock that only moves when the test says so.
final class FakeClock {
  /// Starts at [start], or at 2026-01-01 UTC.
  FakeClock([DateTime? start]) : _now = start ?? DateTime.utc(2026, 1, 1);

  DateTime _now;

  /// Current fake time. Pass it as a `Clock`: `clock: fake.now`.
  DateTime now() => _now;

  /// Moves the time forward by [by].
  void advance(Duration by) {
    _now = _now.add(by);
  }

  /// Jumps to [at].
  void set(DateTime at) {
    _now = at;
  }
}
