/// Cliente de tiempo real: reconexión con backoff, reanudación con lastEventId
/// y deduplicación de eventos por id.
///
/// Los adaptadores SSE y Socket.IO implementan [RealtimeTransport] y se
/// agregan después.
library;

export 'src/backoff.dart';
export 'src/client.dart';
export 'src/fakes.dart';
export 'src/models.dart';
export 'src/transport.dart';
