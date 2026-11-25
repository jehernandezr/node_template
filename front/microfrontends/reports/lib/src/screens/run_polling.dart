import 'dart:async';

/// Reads a run again after [interval] while it is still queued or running.
///
/// The owner calls [follow] after every read with whether something is still
/// pending, and [dispose] when it goes away: no read starts after that.
final class RunPolling {
  RunPolling({required this.interval, required this._read});

  /// Wait between two reads.
  final Duration interval;

  final Future<void> Function() _read;
  Timer? _timer;
  bool _disposed = false;

  /// Schedules the next read when [pending], and cancels it otherwise.
  void follow({required bool pending}) {
    _timer?.cancel();
    _timer = null;
    if (_disposed || !pending) return;
    _timer = Timer(interval, () => unawaited(_read()));
  }

  /// Whether a read is scheduled.
  bool get isScheduled => _timer?.isActive ?? false;

  void dispose() {
    _disposed = true;
    _timer?.cancel();
    _timer = null;
  }
}
