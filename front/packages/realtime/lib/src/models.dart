/// Estado de la conexión de tiempo real.
enum RealtimeStatus { connecting, connected, reconnecting, disconnected }

/// Evento recibido del servidor. [id] es único y creciente por canal, y se usa
/// como Last-Event-ID al reconectar.
final class RealtimeEvent {
  const RealtimeEvent({
    required this.id,
    required this.type,
    required this.data,
    required this.receivedAt,
  });

  final String id;
  final String type;
  final Map<String, Object?> data;
  final DateTime receivedAt;

  @override
  String toString() => 'RealtimeEvent($id, $type)';
}
