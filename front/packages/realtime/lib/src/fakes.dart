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
  bool _closed = false;

  /// lastEventId recibido en cada llamada a [connect], en orden.
  List<String?> get connectLog => List.unmodifiable(_connectLog);

  int get connectCount => _connectLog.length;
  bool get isClosed => _closed;
  bool get isConnected => _active != null;

  @override
  Stream<RealtimeEvent> connect({String? lastEventId}) {
    _connectLog.add(lastEventId);
    _active?.close();
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
    active?.close();
  }

  @override
  Future<void> close() async {
    _closed = true;
    dropConnection();
  }
}
