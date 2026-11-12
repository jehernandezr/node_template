import 'dart:async';

import 'package:flutter/foundation.dart';

import 'enums.dart';
import 'microfrontend.dart';
import 'microfrontend_registry.dart';
import 'microfrontend_scope.dart';
import 'shell_context.dart';
import 'shell_event_bus.dart';
import 'shell_services.dart';
import 'user_session.dart';

/// Owns the event bus, the per-identity services and scopes, and the lifecycles.
///
/// An identity is the pair (userId, tenantId). When it changes, the runtime:
/// - disposes every [MicrofrontendScope] of the previous identity;
/// - clears replayable events on [eventBus];
/// - builds new [ShellServices] with [servicesFactory].
/// Changes that only touch permissions or flags keep the identity.
///
/// On [start], and on each session change, it also works out which
/// lifecycle-enabled manifests are visible. When the identity changes it
/// disposes every active microfrontend first. Then it initializes the visible
/// ones that are not active yet and disposes the ones that are no longer
/// visible. Errors from hooks are reported with [FlutterError.reportError].
final class ShellRuntime {
  /// Creates a runtime for [platform] that follows [session].
  ShellRuntime({
    required this.registry,
    required this.platform,
    required this.session,
    required this.servicesFactory,
  });

  /// Manifests this runtime activates.
  final MicrofrontendRegistry registry;

  /// Platform used to decide visibility.
  final AppPlatform platform;

  /// Session source; each change is checked against the current identity.
  final ValueListenable<UserSession> session;

  /// Builds the services of a new identity. Called once per identity.
  final ShellServices Function(UserSession session) servicesFactory;

  /// Bus shared by the shell and every active microfrontend.
  final ShellEventBus eventBus = ShellEventBus();

  final Map<MicrofrontendId, _Active> _active = {};
  final Map<MicrofrontendId, MicrofrontendScope> _scopes = {};
  ShellServices? _services;
  String? _userId;
  String? _tenantId;
  bool _identityChanged = false;
  bool _started = false;
  bool _disposed = false;
  Future<void> _queue = Future<void>.value();

  /// Ids of the microfrontends currently initialized.
  Set<MicrofrontendId> get activeIds => _active.keys.toSet();

  /// Scope of the microfrontend [id] for the current identity.
  ///
  /// The same instance is returned until the identity changes. Throws
  /// [StateError] if [id] is not registered or the runtime is disposed.
  MicrofrontendScope scopeFor(MicrofrontendId id) {
    if (_disposed) throw StateError('ShellRuntime is already disposed');
    if (registry.manifestFor(id) == null) {
      throw StateError('Microfrontend not registered: ${id.name}');
    }
    _syncIdentity();
    return _scopes.putIfAbsent(id, () => MicrofrontendScope(_services!));
  }

  /// Starts following the session. Returns when the first sync completes.
  Future<void> start() {
    if (_started || _disposed) return _queue;
    _started = true;
    _syncIdentity();
    session.addListener(_onSessionChanged);
    return _enqueue(_sync);
  }

  /// Completes when every queued sync has finished.
  Future<void> whenIdle() => _queue;

  /// Stops following the session, disposes scopes and active microfrontends,
  /// and closes the bus.
  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    session.removeListener(_onSessionChanged);
    await _enqueue(() => _deactivate(_active.keys.toList()));
    final scopes = _scopes.values.toList();
    _scopes.clear();
    await Future.wait(scopes.map((scope) => scope.dispose()));
    await eventBus.dispose();
  }

  void _onSessionChanged() {
    _syncIdentity();
    _enqueue(_sync);
  }

  /// Rotates scopes, services and replay when the identity differs from the
  /// last one. Runs synchronously, so scopes never outlive their identity.
  void _syncIdentity() {
    final current = session.value;
    if (_services != null &&
        current.userId == _userId &&
        current.tenantId == _tenantId) {
      return;
    }
    _userId = current.userId;
    _tenantId = current.tenantId;
    _identityChanged = true;

    final previous = _scopes.values.toList();
    _scopes.clear();
    for (final scope in previous) {
      unawaited(scope.dispose());
    }
    eventBus.clearReplay();
    _services = servicesFactory(current);
  }

  Future<void> _enqueue(Future<void> Function() task) {
    _queue = _queue.then((_) => task()).catchError((
      Object error,
      StackTrace stack,
    ) {
      FlutterError.reportError(
        FlutterErrorDetails(
          exception: error,
          stack: stack,
          library: 'shell_core',
        ),
      );
    });
    return _queue;
  }

  Future<void> _sync() async {
    // A sync queued before dispose must not touch scopes or lifecycles after it.
    if (_disposed) return;
    final current = session.value;
    final identityChanged = _identityChanged;
    _identityChanged = false;

    final wanted = {
      for (final manifest in registry.visibleFor(current, platform))
        if (manifest.lifecycle != null) manifest.id: manifest,
    };
    await _deactivate([
      for (final id in _active.keys)
        if (identityChanged || !wanted.containsKey(id)) id,
    ]);

    for (final entry in wanted.entries) {
      if (_disposed) return;
      if (_active.containsKey(entry.key)) continue;
      final lifecycle = entry.value.lifecycle!;
      final context = ShellContext(
        eventBus: eventBus,
        session: () => session.value,
        scope: scopeFor(entry.key),
      );
      _active[entry.key] = _Active(lifecycle, context);
      try {
        await lifecycle.initialize(context);
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

  Future<void> _deactivate(List<MicrofrontendId> ids) async {
    for (final id in ids) {
      final active = _active.remove(id);
      if (active == null) continue;
      try {
        await active.lifecycle.dispose();
      } catch (error, stack) {
        FlutterError.reportError(
          FlutterErrorDetails(
            exception: error,
            stack: stack,
            library: 'shell_core',
          ),
        );
      }
      await active.context.dispose();
    }
  }
}

final class _Active {
  _Active(this.lifecycle, this.context);

  final Microfrontend lifecycle;
  final ShellContext context;
}
