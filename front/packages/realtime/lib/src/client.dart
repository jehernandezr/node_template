import 'dart:async';

import 'backoff.dart';
import 'models.dart';
import 'transport.dart';

/// Mantiene viva una conexión de tiempo real.
///
/// Reconecta con [RealtimeBackoff] pasando el último id recibido, descarta los
/// eventos cuyo id ya se vio y publica estados y eventos en streams.
class RealtimeClient {
  RealtimeClient(
    this._transport, {
    RealtimeBackoff? backoff,
    this.dedupeWindow = 1000,
  }) : _backoff = backoff ?? RealtimeBackoff();

  final RealtimeTransport _transport;
  final RealtimeBackoff _backoff;

  /// Cuántos ids recientes se recuerdan para descartar duplicados.
  final int dedupeWindow;

  final _events = StreamController<RealtimeEvent>.broadcast();
  final _statuses = StreamController<RealtimeStatus>.broadcast();
  final _seenIds = <String>{};
  RealtimeStatus _status = RealtimeStatus.disconnected;
  String? _lastEventId;
  StreamSubscription<RealtimeEvent>? _subscription;
  Timer? _reconnectTimer;
  int _consecutiveFailures = 0;
  bool _started = false;
  bool _everConnected = false;
  bool _disposed = false;

  RealtimeStatus get status => _status;

  /// Id del último evento aceptado.
  String? get lastEventId => _lastEventId;

  Stream<RealtimeEvent> get events => _events.stream;

  /// Cambios de estado. Solo emite cuando el estado cambia.
  Stream<RealtimeStatus> get statuses => _statuses.stream;

  /// Eventos de un [type] concreto.
  Stream<RealtimeEvent> subscribe(String type) =>
      events.where((event) => event.type == type);

  /// Inicia la conexión. Llamarlo más de una vez no tiene efecto.
  void start() {
    if (_disposed) throw StateError('RealtimeClient ya fue disposed');
    if (_started) return;
    _started = true;
    _open();
  }

  /// Cierra la conexión, cancela los reintentos y cierra los streams.
  Future<void> dispose() async {
    if (_disposed) return;
    _disposed = true;
    _reconnectTimer?.cancel();
    _reconnectTimer = null;
    final subscription = _subscription;
    _subscription = null;
    await subscription?.cancel();
    await _transport.close();
    _setStatus(RealtimeStatus.disconnected);
    await _events.close();
    await _statuses.close();
  }

  void _open() {
    _reconnectTimer = null;
    _setStatus(
      _everConnected ? RealtimeStatus.reconnecting : RealtimeStatus.connecting,
    );
    try {
      final stream = _transport.connect(lastEventId: _lastEventId);
      _subscription = stream.listen(
        _onEvent,
        onError: (_, _) => _onDropped(),
        onDone: _onDropped,
        cancelOnError: true,
      );
      _everConnected = true;
      _setStatus(RealtimeStatus.connected);
    } catch (_) {
      _onDropped();
    }
  }

  void _onEvent(RealtimeEvent event) {
    if (_disposed || !_markSeen(event.id)) return;
    _lastEventId = event.id;
    _consecutiveFailures = 0;
    _events.add(event);
  }

  /// Devuelve false si el id ya se vio dentro de la ventana de deduplicación.
  bool _markSeen(String id) {
    if (!_seenIds.add(id)) return false;
    if (_seenIds.length > dedupeWindow) _seenIds.remove(_seenIds.first);
    return true;
  }

  void _onDropped() {
    if (_disposed || _reconnectTimer != null) return;
    final subscription = _subscription;
    _subscription = null;
    subscription?.cancel();
    _consecutiveFailures++;
    _setStatus(RealtimeStatus.reconnecting);
    _reconnectTimer = Timer(_backoff.delayFor(_consecutiveFailures), _open);
  }

  void _setStatus(RealtimeStatus next) {
    if (next == _status) return;
    _status = next;
    if (!_statuses.isClosed) _statuses.add(next);
  }
}
