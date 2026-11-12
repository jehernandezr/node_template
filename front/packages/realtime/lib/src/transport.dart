import 'models.dart';

/// Canal de bajo nivel (SSE o Socket.IO).
abstract interface class RealtimeTransport {
  /// Abre una conexión. Si [lastEventId] no es null, el servidor reenvía los
  /// eventos posteriores a ese id. Cuando la conexión se corta, el stream
  /// termina o emite error.
  Stream<RealtimeEvent> connect({String? lastEventId});

  /// Cierra la conexión activa.
  Future<void> close();
}
