import 'package:api/api.dart';

/// Transport that fails when used: for tests where the network must stay out.
final class NoNetworkTransport implements HttpTransport {
  @override
  Future<TransportResponse> send(TransportRequest request) =>
      throw StateError('no network in this test');

  @override
  void close() {}
}
