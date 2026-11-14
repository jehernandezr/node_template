import 'dart:async';

import 'models.dart';
import 'transport.dart';

/// Transporte controlable desde pruebas.
///
/// Guarda todos los eventos emitidos. Al conectar con un lastEventId, reenvía
/// los que siguen a ese id, como haría el servidor con Last-Event-ID.
class FakeRealtimeTransport implements RealtimeTransport {
  final List<RealtimeEvent> _history = [];
  final List<String?> _connectLog = [];
  StreamController<RealtimeEvent>? _active;
  void Function()? _pendingOpen;
  bool _closed = false;

  /// Si es true (por defecto), cada conexión se abre sola en el siguiente
  /// microtask. Con false, la prueba la abre con [open].
  bool autoOpen = true;

  /// Si no es null, [connect] lanza este error en lugar de conectar.
  Object? connectError;

  /// lastEventId recibido en cada llamada a [connect], en orden.
  List<String?> get connectLog => List.unmodifiable(_connectLog);

  int get connectCount => _connectLog.length;
  bool get isClosed => _closed;
  bool get isConnected => _active != null;

  @override
  Stream<RealtimeEvent> connect({
    String? lastEventId,
    void Function()? onOpen,
  }) {
    _connectLog.add(lastEventId);
    final error = connectError;
    if (error != null) throw error;
    _active?.close();
    _pendingOpen = onOpen;
    if (autoOpen) scheduleMicrotask(open);
    final controller = StreamController<RealtimeEvent>();
    if (lastEventId != null) {
      final index = _history.indexWhere((event) => event.id == lastEventId);
      if (index >= 0) {
        for (final event in _history.skip(index + 1)) {
          controller.add(event);
        }
      }
    }
    _active = controller;
    return controller.stream;
  }

  /// Confirma la apertura de la conexión activa, como haría el servidor.
  void open() {
    final onOpen = _pendingOpen;
    _pendingOpen = null;
    onOpen?.call();
  }

  /// Corta la conexión activa con [error], como un fallo del transporte.
  void failConnection(Object error) {
    final active = _active;
    _active = null;
    _pendingOpen = null;
    if (active == null) return;
    active.addError(error, StackTrace.current);
    active.close();
  }

  /// Emite un evento. Si no hay conexión activa, queda disponible para el próximo replay.
  void emit(RealtimeEvent event) {
    _history.add(event);
    final active = _active;
    if (active != null && !active.isClosed) active.add(event);
  }

  /// Corta la conexión activa como lo haría una caída de red.
  void dropConnection() {
    final active = _active;
    _active = null;
    _pendingOpen = null;
    active?.close();
  }

  @override
  Future<void> close() async {
    _closed = true;
    dropConnection();
  }
}
