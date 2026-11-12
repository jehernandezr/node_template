import 'dart:async';

/// Base type for events exchanged between microfrontends through the shell.
///
/// Microfrontends never import each other; they share event types declared
/// in `front/packages` and talk through [ShellEventBus].
abstract class ShellEvent {
  const ShellEvent();
}

/// Event whose latest instance per type is kept, so late listeners can replay it.
abstract class ReplayableShellEvent extends ShellEvent {
  const ReplayableShellEvent();
}

/// Typed broadcast bus shared by the shell and its microfrontends.
final class ShellEventBus {
  final StreamController<ShellEvent> _controller =
      StreamController<ShellEvent>.broadcast();
  final Map<Type, ReplayableShellEvent> _lastByType = {};

  /// Publishes [event] to current listeners. No-op after [dispose].
  void emit(ShellEvent event) {
    if (_controller.isClosed) return;
    if (event is ReplayableShellEvent) _lastByType[event.runtimeType] = event;
    _controller.add(event);
  }

  /// Events whose type is [T].
  ///
  /// With [replay], the latest stored [ReplayableShellEvent] instances of type
  /// [T] are delivered first.
  Stream<T> on<T extends ShellEvent>({bool replay = false}) =>
      Stream<T>.multi((controller) {
        if (replay) {
          for (final event in _lastByType.values.whereType<T>()) {
            controller.add(event);
          }
        }
        final subscription = _controller.stream
            .where((event) => event is T)
            .cast<T>()
            .listen(
              controller.add,
              onError: controller.addError,
              onDone: controller.close,
            );
        controller.onCancel = subscription.cancel;
      });

  /// Forgets the stored replayable events. The shell calls this when the identity changes.
  void clearReplay() => _lastByType.clear();

  /// Closes the bus and forgets replayable events.
  Future<void> dispose() {
    _lastByType.clear();
    return _controller.close();
  }
}
