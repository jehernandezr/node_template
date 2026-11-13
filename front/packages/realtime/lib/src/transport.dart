import 'models.dart';

/// Canal de bajo nivel (SSE o Socket.IO).
abstract interface class RealtimeTransport {
  /// Abre una conexión. Si [lastEventId] no es null, el servidor reenvía los
  /// eventos posteriores a ese id. Cuando la conexión se corta, el stream
  /// termina o emite error.
  ///
  /// El transporte llama a [onOpen] una vez, cuando el servidor acepta la
  /// conexión (evento `open` de SSE o `connect` de Socket.IO). Hasta entonces,
  /// o hasta el primer evento, el cliente no la da por conectada.
  Stream<RealtimeEvent> connect({String? lastEventId, void Function()? onOpen});

  /// Cierra la conexión activa.
  Future<void> close();
}
