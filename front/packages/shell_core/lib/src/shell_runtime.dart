import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';

import 'enums.dart';
import 'microfrontend.dart';
import 'microfrontend_registry.dart';
import 'microfrontend_scope.dart';
import 'shell_context.dart';
import 'shell_event_bus.dart';
import 'shell_services.dart';
import 'user_session.dart';

/// Default wait before retrying a lifecycle whose `initialize` failed
/// [failures] times in a row: 1 s, 2 s, 4 s... up to 5 minutes.
Duration defaultLifecycleRetryDelay(int failures) {
  const max = Duration(minutes: 5);
  final seconds = math.pow(2, math.min(failures - 1, 16)).toInt();
  final delay = Duration(seconds: seconds);
  return delay > max ? max : delay;
}

/// Owns the event bus, the per-identity services and scopes, and the lifecycles.
///
/// An identity is the pair (userId, tenantId). The runtime follows the session
/// from the moment it is created. When the identity changes it synchronously:
/// - disposes the [ShellContext] of every active lifecycle, so their late
///   events and listeners no longer reach the bus;
/// - disposes every [MicrofrontendScope] of the previous identity (and the
///   [ScopedResource]s in them);
/// - clears replayable events on [eventBus];
/// - increments [identityEpoch], which re-keys the mounted microfrontend pages
///   (see `buildShellRouter`).
/// The [ShellServices] of the new identity are built on first use with
/// [servicesFactory]. Changes that only touch permissions, flags or the MFA
/// time keep the identity.
///
/// After [start], each session change also queues a sync of the lifecycles:
/// when the identity changed it disposes every active lifecycle first; then it
/// initializes the visible ones that are not active yet and disposes the ones
/// that are no longer visible. Each activation gets a new instance from the
/// manifest's `lifecycleFactory`. A lifecycle whose `initialize` throws is
/// disposed and retried after [lifecycleRetryDelay]. Errors from hooks are
/// reported with [FlutterError.reportError].
final class ShellRuntime {
  /// Creates a runtime for [platform] that follows [session].
  ShellRuntime({
    required this.registry,
    required this.platform,
    required this.session,
    required this.servicesFactory,
    this.clock = DateTime.now,
    this.lifecycleRetryDelay = defaultLifecycleRetryDelay,
  }) {
    _userId = session.value.userId;
    _tenantId = session.value.tenantId;
    session.addListener(_checkIdentity);
  }

  /// Manifests this runtime activates.
  final MicrofrontendRegistry registry;

  /// Platform used to decide visibility.
  final AppPlatform platform;

  /// Session source; each change is checked against the current identity.
  final ValueListenable<UserSession> session;

  /// Builds the services of a new identity. Called once per identity.
  final ShellServices Function(UserSession session) servicesFactory;

  /// Current time, used for MFA freshness.
  final DateTime Function() clock;

  /// Wait before retrying a lifecycle that failed to initialize, given the
  /// number of consecutive failures (1 for the first one).
  final Duration Function(int failures) lifecycleRetryDelay;

  /// Bus shared by the shell and every active microfrontend.
  final ShellEventBus eventBus = ShellEventBus();

  /// Increments every time the user or tenant changes. Starts at 0.
  ///
  /// `buildShellRouter` keys each microfrontend page with it, so mounted
  /// screens build their state again for the new identity.
  ValueListenable<int> get identityEpoch => _identityEpoch;
  // Not disposed: pages may still remove their listeners after the runtime.
  final ValueNotifier<int> _identityEpoch = ValueNotifier<int>(0);

  final Map<MicrofrontendId, _Active> _active = {};
  final Map<MicrofrontendId, MicrofrontendScope> _scopes = {};
  final Map<MicrofrontendId, _Retry> _retries = {};
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
    _checkIdentity();
    final services = _services ??= servicesFactory(session.value);
    return _scopes.putIfAbsent(id, () => MicrofrontendScope(services));
  }

  /// Starts the lifecycles. Returns when the first sync completes.
  Future<void> start() {
    if (_started || _disposed) return _queue;
    _started = true;
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
    session.removeListener(_checkIdentity);
    session.removeListener(_onSessionChanged);
    _cancelRetries();
    for (final active in _active.values) {
      unawaited(active.context.dispose());
    }
    await _enqueue(() => _deactivate(_active.keys.toList()));
    final scopes = _scopes.values.toList();
    _scopes.clear();
    await Future.wait(scopes.map((scope) => scope.dispose()));
    await eventBus.dispose();
  }

  void _onSessionChanged() {
    _checkIdentity();
    _enqueue(_sync);
  }

  /// Rotates contexts, scopes, services, replay and epoch when the identity
  /// differs from the last one. Runs synchronously, so nothing of the
  /// previous identity is reachable once the session has changed.
  void _checkIdentity() {
    if (_disposed) return;
    final current = session.value;
    if (current.userId == _userId && current.tenantId == _tenantId) return;
    _userId = current.userId;
    _tenantId = current.tenantId;
    _identityChanged = true;

    for (final active in _active.values) {
      unawaited(active.context.dispose());
    }
    _cancelRetries();
    final previous = _scopes.values.toList();
    _scopes.clear();
    for (final scope in previous) {
      unawaited(scope.dispose());
    }
    eventBus.clearReplay();
    _services = null;
    _identityEpoch.value++;
  }

  Future<void> _enqueue(Future<void> Function() task) {
    _queue = _queue.then((_) => task()).catchError(_report);
    return _queue;
  }

  Future<void> _sync() async {
    // A sync queued before dispose must not touch scopes or lifecycles after it.
    if (_disposed) return;
    final current = session.value;
    final identityChanged = _identityChanged;
    _identityChanged = false;

    final wanted = {
      for (final manifest in registry.visibleFor(
        current,
        platform,
        now: clock(),
      ))
        if (manifest.hasLifecycle) manifest.id: manifest,
    };
    await _deactivate([
      for (final id in _active.keys)
        if (identityChanged || !wanted.containsKey(id)) id,
    ]);
    for (final id in _retries.keys.toList()) {
      if (!wanted.containsKey(id)) _retries.remove(id)?.timer?.cancel();
    }

    for (final entry in wanted.entries) {
      if (_disposed) return;
      final id = entry.key;
      if (_active.containsKey(id)) continue;
      if (_retries[id]?.waiting ?? false) continue;
      final lifecycle = entry.value.createLifecycle()!;
      final epoch = _identityEpoch.value;
      final context = ShellContext(
        eventBus: eventBus,
        session: () => session.value,
        scope: scopeFor(id),
      );
      _active[id] = _Active(lifecycle, context);
      try {
        await lifecycle.initialize(context);
        if (epoch == _identityEpoch.value) _retries.remove(id);
      } catch (error, stack) {
        // A context cancelled meanwhile means the identity changed or the
        // runtime was disposed: the failure belongs to an abandoned start.
        if (!context.isDisposed) _report(error, stack);
        if (identical(_active[id]?.context, context)) _active.remove(id);
        await _release(_Active(lifecycle, context));
        if (!_disposed && epoch == _identityEpoch.value) _scheduleRetry(id);
      }
    }
  }

  void _scheduleRetry(MicrofrontendId id) {
    final retry = _retries.putIfAbsent(id, _Retry.new);
    retry.failures++;
    retry.timer?.cancel();
    retry.timer = Timer(lifecycleRetryDelay(retry.failures), () {
      retry.timer = null;
      if (!_disposed) _enqueue(_sync);
    });
  }

  void _cancelRetries() {
    for (final retry in _retries.values) {
      retry.timer?.cancel();
    }
    _retries.clear();
  }

  Future<void> _deactivate(List<MicrofrontendId> ids) async {
    for (final id in ids) {
      final active = _active.remove(id);
      if (active != null) await _release(active);
    }
  }

  Future<void> _release(_Active active) async {
    try {
      await active.lifecycle.dispose();
    } catch (error, stack) {
      _report(error, stack);
    }
    await active.context.dispose();
  }

  static void _report(Object error, StackTrace stack) {
    FlutterError.reportError(
      FlutterErrorDetails(
        exception: error,
        stack: stack,
        library: 'shell_core',
      ),
    );
  }
}

final class _Active {
  _Active(this.lifecycle, this.context);

  final Microfrontend lifecycle;
  final ShellContext context;
}

/// Consecutive init failures of one lifecycle and the pending retry timer.
final class _Retry {
  int failures = 0;
  Timer? timer;

  /// Whether the backoff is still running.
  bool get waiting => timer != null;
}
