import 'package:api/api.dart';

/// Transport for an [ApiClient] that never sends a request, for tests that
/// only need a client to exist.
final class IdleTransport implements HttpTransport {
  @override
  Future<TransportResponse> send(TransportRequest request) =>
      throw StateError('IdleTransport never sends');

  @override
  void close() {}
}
