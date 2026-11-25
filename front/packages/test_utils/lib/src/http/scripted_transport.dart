import 'dart:convert';

import 'package:api/api.dart';
import 'package:contracts/contracts.dart';
import 'package:shell_core/shell_core.dart';

import '../session/session_builder.dart';

/// [HttpTransport] that answers from a script and records every request, so
/// an API repository is tested against the wire format without a backend.
///
/// Each request takes the next scripted answer in order; a request without
/// one fails the test with a [StateError].
final class ScriptedTransport implements HttpTransport {
  /// A transport with no answers yet: script them with [json], [empty],
  /// [problem] or [unreachable].
  ScriptedTransport() : _otherwise = null;

  /// A transport that answers 503 to every request not scripted.
  ScriptedTransport.unavailable()
    : _otherwise = (() async => const TransportResponse(statusCode: 503));

  final Future<TransportResponse> Function()? _otherwise;

  /// Requests in the order they were sent.
  final List<TransportRequest> requests = [];

  final List<Future<TransportResponse> Function()> _answers = [];
  final Map<String, List<Future<TransportResponse> Function()>> _byPath = {};

  /// Whether [close] ran.
  bool isClosed = false;

  /// Answers the next request with [status] and [body] encoded as JSON. With
  /// [path], only the next request to that path, whatever came before it.
  void json(int status, Object? body, {String? path}) => _script(
    () async => TransportResponse(
      statusCode: status,
      headers: const {'content-type': 'application/json'},
      body: jsonEncode(body),
    ),
    path,
  );

  /// Answers the next request with [status] and no body.
  void empty(int status) =>
      _answers.add(() async => TransportResponse(statusCode: status));

  /// Answers the next request with [problem] as a problem document. With
  /// [path], only the next request to that path.
  void problem(ProblemDetails problem, {String? path}) => _script(
    () async => TransportResponse(
      statusCode: problem.status,
      headers: const {'content-type': 'application/problem+json'},
      body: jsonEncode(problem.toJson()),
    ),
    path,
  );

  /// Fails the next request without an HTTP answer.
  void unreachable() => _answers.add(
    () async => throw TransportException(
      TransportFailure.connection,
      uri: Uri.parse('https://unreachable.test'),
    ),
  );

  /// Whether every scripted answer was used.
  bool get isDrained =>
      _answers.isEmpty && _byPath.values.every((answers) => answers.isEmpty);

  /// The requests sent to [path], in order.
  List<TransportRequest> requestsTo(String path) => [
    for (final request in requests)
      if (request.uri.path == path) request,
  ];

  /// The JSON body of request number [index], decoded.
  Map<String, dynamic> bodyOf(int index) =>
      jsonDecode(requests[index].body ?? 'null') as Map<String, dynamic>;

  @override
  Future<TransportResponse> send(TransportRequest request) {
    requests.add(request);
    final forPath = _byPath[request.uri.path];
    if (forPath != null && forPath.isNotEmpty) return forPath.removeAt(0)();
    if (_answers.isNotEmpty) return _answers.removeAt(0)();
    final otherwise = _otherwise;
    if (otherwise != null) return otherwise();
    throw StateError('No scripted answer for ${request.method} ${request.uri}');
  }

  @override
  void close() => isClosed = true;

  void _script(Future<TransportResponse> Function() answer, String? path) =>
      path == null ? _answers.add(answer) : (_byPath[path] ??= []).add(answer);
}

/// An [ApiClient] over [transport] with a fixed token, for repository tests.
abstract final class ScriptedApi {
  /// Base of every request the client sends.
  static final Uri baseUri = Uri.parse('https://api.example.test');

  /// Client that signs every authenticated route with a test token.
  static ApiClient client(ScriptedTransport transport) => ApiClient(
    transport: transport,
    baseUri: baseUri,
    accessToken: () async => 'test-session',
  );

  /// A live scope whose repositories talk to [transport].
  static MicrofrontendScope liveScope(
    ScriptedTransport transport, {
    String userId = 'user-1',
  }) => MicrofrontendScope(
    ShellServices(
      session: SessionBuilder(userId: userId).build(),
      mode: ShellMode.live,
      api: client(transport),
    ),
  );
}
