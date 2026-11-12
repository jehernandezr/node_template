import 'dart:async';

import 'microfrontend_scope.dart';
import 'shell_event_bus.dart';
import 'user_session.dart';

/// Services the shell gives a microfrontend while it is active.
///
/// Subscriptions made with [listen] are cancelled by [dispose], which the
/// runtime calls when the microfrontend stops being active.
final class ShellContext {
  /// Creates a context over [eventBus], the session accessor [session] and,
  /// when the runtime provides it, the microfrontend's [scope].
  ShellContext({required this.eventBus, required this.session, this.scope});

  /// Dependency scope of this microfrontend for the current identity.
  ///
  /// The same instances that its screens receive, so a lifecycle and its
  /// screens share one repository. Null only in tests that build a context
  /// without a runtime.
  final MicrofrontendScope? scope;

  /// Bus used to exchange events with other microfrontends.
  final ShellEventBus eventBus;

  /// Returns the current session.
  final UserSession Function() session;

  final List<StreamSubscription<ShellEvent>> _subscriptions = [];
  bool _disposed = false;

  /// Whether [dispose] has run.
  bool get isDisposed => _disposed;

  /// Listens to events of type [T] until this context is disposed.
  ///
  /// Throws [StateError] if the context is already disposed.
  StreamSubscription<ShellEvent> listen<T extends ShellEvent>(
    void Function(T event) onEvent,
  ) {
    if (_disposed) throw StateError('ShellContext is already disposed');
    final subscription = eventBus.on<T>().listen(onEvent);
    _subscriptions.add(subscription);
    return subscription;
  }

  /// Cancels every subscription made through [listen].
  Future<void> dispose() async {
    _disposed = true;
    final pending = List.of(_subscriptions);
    _subscriptions.clear();
    await Future.wait(pending.map((subscription) => subscription.cancel()));
  }
}
