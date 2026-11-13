import 'dart:async';

import 'backoff.dart';
import 'models.dart';
import 'transport.dart';

/// Mantiene viva una conexión de tiempo real.
///
/// Reconecta con [RealtimeBackoff] pasando el último id recibido, descarta los
/// eventos cuyo id ya se vio y publica estados y eventos en streams. Una
/// conexión cuenta como conectada cuando el transporte confirma la apertura o
/// llega su primer evento. Los errores del transporte se publican en [errors]
/// antes de reconectar.
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
  final _errors = StreamController<RealtimeError>.broadcast();
  final _seenIds = <String>{};
  RealtimeStatus _status = RealtimeStatus.disconnected;
  String? _lastEventId;
  StreamSubscription<RealtimeEvent>? _subscription;
  Timer? _reconnectTimer;
  int _consecutiveFailures = 0;

  /// Incrementa en cada intento de conexión, para ignorar avisos de intentos
  /// anteriores.
  int _attempt = 0;
  bool _started = false;
  bool _everConnected = false;
  bool _disposed = false;

  RealtimeStatus get status => _status;

  /// Id del último evento aceptado.
  String? get lastEventId => _lastEventId;

  Stream<RealtimeEvent> get events => _events.stream;

  /// Cambios de estado. Solo emite cuando el estado cambia.
  Stream<RealtimeStatus> get statuses => _statuses.stream;

  /// Errores del transporte: una conexión que no se pudo abrir o que se cayó
  /// con error. El cliente reconecta igual.
  Stream<RealtimeError> get errors => _errors.stream;

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
    await _errors.close();
  }

  void _open() {
    _reconnectTimer = null;
    final attempt = ++_attempt;
    _setStatus(
      _everConnected ? RealtimeStatus.reconnecting : RealtimeStatus.connecting,
    );
    try {
      final stream = _transport.connect(
        lastEventId: _lastEventId,
        onOpen: () => _onOpened(attempt),
      );
      _subscription = stream.listen(
        (event) => _onEvent(attempt, event),
        onError: (Object error, StackTrace stack) {
          _reportError(error, stack);
          _onDropped();
        },
        onDone: _onDropped,
        cancelOnError: true,
      );
    } catch (error, stack) {
      _reportError(error, stack);
      _onDropped();
    }
  }

  void _onOpened(int attempt) {
    if (_disposed || attempt != _attempt || _reconnectTimer != null) return;
    _everConnected = true;
    _setStatus(RealtimeStatus.connected);
  }

  void _onEvent(int attempt, RealtimeEvent event) {
    if (_disposed) return;
    _onOpened(attempt);
    if (!_markSeen(event.id)) return;
    _lastEventId = event.id;
    _consecutiveFailures = 0;
    _events.add(event);
  }

  void _reportError(Object error, StackTrace stack) {
    if (!_errors.isClosed) _errors.add(RealtimeError(error, stack));
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
