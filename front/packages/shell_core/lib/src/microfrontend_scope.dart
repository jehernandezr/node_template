import 'package:flutter/foundation.dart';

import 'shell_services.dart';

/// Per-identity container of a microfrontend's objects.
///
/// The runtime owns one scope per microfrontend and identity. Call [get] to
/// obtain an object; the first call creates it and later calls return the same
/// instance until [dispose] runs (which happens when the identity changes).
final class MicrofrontendScope {
  /// Creates an empty scope over [services]. The runtime creates these.
  MicrofrontendScope(ShellServices services) : _services = services;

  /// Services of the identity this scope belongs to.
  ShellServices get services => _services;
  final ShellServices _services;

  final List<_Entry> _entries = [];
  final Map<Type, _Entry> _byType = {};
  bool _disposed = false;

  /// Returns the single instance of [T], creating it with [create] on first use.
  ///
  /// [dispose] is kept with the instance and runs once when the scope is
  /// disposed, in reverse creation order. Throws [StateError] after [dispose].
  T get<T extends Object>(
    T Function(ShellServices services) create, {
    void Function(T value)? dispose,
  }) {
    if (_disposed) throw StateError('MicrofrontendScope is already disposed');
    final existing = _byType[T];
    if (existing != null) return existing.value as T;

    final value = create(_services);
    final entry = _Entry(
      T,
      value,
      dispose == null ? null : (Object v) => dispose(v as T),
    );
    _byType[T] = entry;
    _entries.add(entry);
    return value;
  }

  /// Disposes every instance in reverse creation order. Errors are reported
  /// with [FlutterError.reportError] and do not stop the others.
  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    final entries = _entries.reversed.toList();
    _entries.clear();
    _byType.clear();
    for (final entry in entries) {
      try {
        entry.dispose?.call(entry.value);
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
  _Entry(this.type, this.value, this.dispose);

  final Type type;
  final Object value;
  final void Function(Object value)? dispose;
}
