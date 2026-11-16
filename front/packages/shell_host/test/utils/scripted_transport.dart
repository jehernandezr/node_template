import 'package:api/api.dart';

/// Transport whose answer each test decides. It records whether it was
/// closed.
final class ScriptedTransport implements HttpTransport {
  ScriptedTransport(this.answer);

  /// A transport that answers every request with status 503.
  ScriptedTransport.unavailable()
    : answer = ((_) async => const TransportResponse(statusCode: 503));

  Future<TransportResponse> Function(TransportRequest request) answer;
  bool closed = false;

  @override
  Future<TransportResponse> send(TransportRequest request) => answer(request);

  @override
  void close() => closed = true;
}
