import 'package:utils/utils.dart';

/// Latency, programmable failures and shutdown shared by the demo fakes.
/// Each fake receives one by constructor.
final class DemoBehavior {
  /// A behavior that waits [delay] on every response and reads the time from
  /// [clock].
  DemoBehavior({this.delay = Duration.zero, this._clock = systemClock});

  /// Artificial wait of every response.
  final Duration delay;

  final Clock _clock;

  bool _disposed = false;

  final List<_ScheduledFailure> _failures = [];

  /// The fake's current time.
  DateTime now() => _clock();

  /// Whether [dispose] ran.
  bool get isDisposed => _disposed;

  /// Waits [delay], then throws the next failure that applies, or returns
  /// [compute]. [operation] tags the call (an enum value of the fake) so a
  /// failure can target one operation. After [dispose] it throws
  /// [DemoDisposedException].
  ///
  /// Disposal can happen while the response is still waiting.
  Future<T> respond<T>(T Function() compute, {Object? operation}) async {
    _ensureServing();
    if (delay > Duration.zero) await Future<void>.delayed(delay);
    _ensureServing();
    final applies = _failures.where((f) => f.appliesTo(operation));
    if (applies.isNotEmpty) {
      final failure = applies.first;
      failure.remaining--;
      if (failure.remaining == 0) _failures.remove(failure);
      throw failure.error;
    }
    return compute();
  }

  /// Makes the next [count] calls (of [operation], or of any when null) throw
  /// [error].
  void failNext(Object error, {int count = 1, Object? operation}) {
    if (count < 1) {
      throw ArgumentError.value(count, 'count', 'must be at least 1');
    }
    _failures.add(_ScheduledFailure(error, count, operation));
  }

  /// Stops serving: later and pending calls throw [DemoDisposedException].
  void dispose() {
    _disposed = true;
    _failures.clear();
  }

  void _ensureServing() {
    if (_disposed) throw const DemoDisposedException();
  }
}

/// Thrown by a [DemoBehavior] after it was disposed.
final class DemoDisposedException implements Exception {
  /// Creates the exception.
  const DemoDisposedException();
}

final class _ScheduledFailure {
  _ScheduledFailure(this.error, this.remaining, this.operation);

  final Object error;
  int remaining;
  final Object? operation;

  bool appliesTo(Object? call) => operation == null || operation == call;
}
