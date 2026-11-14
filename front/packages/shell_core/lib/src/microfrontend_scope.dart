import 'dart:async';

import 'package:flutter/foundation.dart';

import 'shell_event_bus.dart';
import 'shell_services.dart';

/// Object that holds resources for one identity, such as a repository with
/// open streams, sockets or timers.
///
/// A [MicrofrontendScope] calls [dispose] on every object of this type it
/// created when the scope closes, which happens when the user or tenant
/// changes and when the runtime is disposed.
abstract interface class ScopedResource {
  /// Releases the resources. Called once, by the scope.
  FutureOr<void> dispose();
}

/// Per-identity container of a microfrontend's objects.
///
/// The runtime owns one scope per microfrontend and identity. Call [get] to
/// obtain an object; the first call creates it and later calls return the same
/// instance until [dispose] runs (which happens when the identity changes).
final class MicrofrontendScope {
  /// Creates an empty scope over [services]. The runtime creates these and
  /// passes its [eventBus]; without one, [emit] drops every event.
  MicrofrontendScope(ShellServices services, {ShellEventBus? eventBus})
    : _services = services,
      // ignore: prefer_initializing_formals
      _eventBus = eventBus;

  /// Services of the identity this scope belongs to.
  ShellServices get services => _services;
  final ShellServices _services;

  final ShellEventBus? _eventBus;

  final List<_Entry> _entries = [];
  final Map<Type, _Entry> _byType = {};
  bool _disposed = false;

  /// Whether [dispose] has started. A disposed scope refuses [get].
  bool get isDisposed => _disposed;

  /// Publishes [event] on the shell bus while this scope is alive.
  ///
  /// After [dispose] (the identity changed) the event is dropped silently, so
  /// a screen or repository of the previous user cannot reach the next one.
  void emit(ShellEvent event) {
    if (_disposed) return;
    _eventBus?.emit(event);
  }

  /// Returns the single instance of [T], creating it with [create] on first use.
  ///
  /// When the scope is disposed, in reverse creation order, each instance is
  /// released with [dispose] when given, otherwise with
  /// [ScopedResource.dispose] when the instance implements [ScopedResource].
  /// Prefer [ScopedResource] for your own classes; keep [dispose] for objects
  /// you cannot change.
  /// Throws [StateError] after [dispose].
  T get<T extends Object>(
    T Function(ShellServices services) create, {
    FutureOr<void> Function(T value)? dispose,
  }) {
    if (_disposed) throw StateError('MicrofrontendScope is already disposed');
    final existing = _byType[T];
    if (existing != null) return existing.value as T;

    final value = create(_services);
    final FutureOr<void> Function(Object value)? release;
    if (dispose != null) {
      release = (Object v) => dispose(v as T);
    } else if (value is ScopedResource) {
      release = (Object v) => (v as ScopedResource).dispose();
    } else {
      release = null;
    }
    final entry = _Entry(T, value, release);
    _byType[T] = entry;
    _entries.add(entry);
    return value;
  }

  /// Disposes every instance in reverse creation order, waiting for each one.
  ///
  /// The scope refuses [get] as soon as this is called. Errors are reported
  /// with [FlutterError.reportError] and do not stop the others.
  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    final entries = _entries.reversed.toList();
    _entries.clear();
    _byType.clear();
    for (final entry in entries) {
      final release = entry.release;
      if (release == null) continue;
      try {
        await release(entry.value);
      } catch (error, stack) {
        FlutterError.reportError(
          FlutterErrorDetails(
            exception: error,
            stack: stack,
            library: 'shell_core',
          ),
        );
      }
    }
  }
}

final class _Entry {
  _Entry(this.type, this.value, this.release);

  final Type type;
  final Object value;
  final FutureOr<void> Function(Object value)? release;
}
