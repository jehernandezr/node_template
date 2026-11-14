import 'dart:async';

import 'microfrontend_scope.dart';
import 'shell_event_bus.dart';
import 'user_session.dart';

/// Services the shell gives a microfrontend lifecycle while it is active.
///
/// A context belongs to one activation and one identity. The runtime disposes
/// it synchronously when the user or tenant changes, before the lifecycle's
/// own `dispose` runs: from then on [emit] drops events and the subscriptions
/// made with [listen] are cancelled, so nothing of the previous user reaches
/// the next one.
final class ShellContext {
  /// Creates a context over [eventBus], the session accessor [session] and,
  /// when the runtime provides it, the microfrontend's [scope].
  ShellContext({
    required ShellEventBus eventBus,
    required this.session,
    this.scope,
    // ignore: prefer_initializing_formals
  }) : _eventBus = eventBus;

  /// Dependency scope of this microfrontend for the current identity.
  ///
  /// The same instances that its screens receive, so a lifecycle and its
  /// screens share one repository. Null only in tests that build a context
  /// without a runtime.
  final MicrofrontendScope? scope;

  final ShellEventBus _eventBus;

  /// Returns the current session.
  final UserSession Function() session;

  final List<StreamSubscription<ShellEvent>> _subscriptions = [];
  bool _disposed = false;

  /// Whether [dispose] has run.
  bool get isDisposed => _disposed;

  /// Publishes [event] on the shell bus while this context is active.
  ///
  /// After [dispose] the event is dropped silently: a stream callback of the
  /// previous identity that fires late cannot reach the next user.
  void emit(ShellEvent event) {
    if (_disposed) return;
    _eventBus.emit(event);
  }

  /// Listens to events of type [T] until this context is disposed.
  ///
  /// Throws [StateError] if the context is already disposed.
  StreamSubscription<ShellEvent> listen<T extends ShellEvent>(
    void Function(T event) onEvent,
  ) {
    if (_disposed) throw StateError('ShellContext is already disposed');
    final subscription = _eventBus.on<T>().listen((event) {
      if (!_disposed) onEvent(event);
    });
    _subscriptions.add(subscription);
    return subscription;
  }

  /// Marks the context disposed and cancels every subscription made through
  /// [listen].
  ///
  /// The context stops emitting and delivering events synchronously, before
  /// the returned future completes. Calling it again is a no-op.
  Future<void> dispose() async {
    _disposed = true;
    final pending = List.of(_subscriptions);
    _subscriptions.clear();
    await Future.wait(pending.map((subscription) => subscription.cancel()));
  }
}
