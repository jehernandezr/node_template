import 'dart:convert';

import 'package:contracts/contracts.dart';

import 'http_transport.dart';

/// Returns the current access token, or null when there is no session.
typedef AccessTokenProvider = Future<String?> Function();

/// Client for the public routes of the contracts.
///
/// Every call validates the request with the generated validator before it
/// touches the network: an invalid request throws [ContractViolationException]
/// with the same field errors the server would return, and the transport is
/// never called. Error answers become [ApiErrorException] and successful
/// answers are validated and decoded into the generated response type.
class ApiClient {
  ApiClient({
    required this.transport,
    required this.baseUri,
    this.accessToken,
    this.defaultHeaders = const {},
  });

  /// Port that sends the HTTP requests.
  final HttpTransport transport;

  /// Base of every route path, for example `https://api.example.com`.
  final Uri baseUri;

  /// Source of the access token for routes that need a session.
  final AccessTokenProvider? accessToken;

  /// Headers added to every request, for example `accept-language`.
  final Map<String, String> defaultHeaders;

  /// Sends [request] through [route] and returns the decoded response.
  ///
  /// Throws [ContractViolationException] when the request or the response
  /// break the contract, and [ApiErrorException] when the API answers an error.
  Future<Res> send<Req, Res>(
    RouteDescriptor<Req, Res> route,
    Req request,
  ) async {
    final json = route.encodeRequest(request);
    final errors = route.validateRequest(json);
    if (errors.isNotEmpty) {
      throw ContractViolationException(routeId: route.id, errors: errors);
    }

    final headers = <String, String>{
      'accept': 'application/json, application/problem+json',
      ...defaultHeaders,
    };
    if (route.requiresAuth) {
      final token = await accessToken?.call();
      if (token != null) headers['authorization'] = 'Bearer $token';
    }
    final (uri, body) = _encode(route, json);
    if (body != null) headers['content-type'] = 'application/json';

    final response = await transport.send(
      TransportRequest(
        method: route.method.wireCode,
        uri: uri,
        headers: headers,
        body: body,
      ),
    );

    if (response.statusCode < 200 || response.statusCode > 299) {
      throw ApiErrorException(_problemOf(response));
    }
    final decode = route.decodeResponse;
    if (decode == null) return null as Res;

    final Object? decoded;
    try {
      decoded = jsonDecode(response.body);
    } on FormatException {
      throw ContractViolationException(
        routeId: route.id,
        errors: [
          FieldError(code: PlatformErrorCode.validationInvalidType.code),
        ],
        inResponse: true,
      );
    }
    final responseErrors =
        route.validateResponse?.call(decoded) ??
        [
          if (decoded is! Map<String, dynamic>)
            FieldError(code: PlatformErrorCode.validationInvalidType.code),
        ];
    if (responseErrors.isNotEmpty || decoded is! Map<String, dynamic>) {
      throw ContractViolationException(
        routeId: route.id,
        errors: responseErrors,
        inResponse: true,
      );
    }
    return decode(decoded);
  }

  (Uri, String?) _encode<Req, Res>(
    RouteDescriptor<Req, Res> route,
    Map<String, dynamic> json,
  ) {
    final rest = Map<String, dynamic>.of(json);
    var path = route.path;
    for (final param in route.pathParams) {
      final value = rest.remove(param);
      path = path.replaceAll('{$param}', Uri.encodeComponent('$value'));
    }
    final basePath = baseUri.path.endsWith('/')
        ? baseUri.path.substring(0, baseUri.path.length - 1)
        : baseUri.path;
    if (route.requestLocation == RequestLocation.body) {
      return (baseUri.replace(path: '$basePath$path'), jsonEncode(rest));
    }
    // Forma canónica del contrato: números en notación JSON, booleanos
    // true/false y listas como parámetro repetido.
    final query = encodeQuery(rest);
    return (
      baseUri.replace(
        path: '$basePath$path',
        queryParameters: query.isEmpty ? null : query,
      ),
      null,
    );
  }

  ProblemDetails _problemOf(TransportResponse response) {
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic> &&
          ProblemDetailsSchema.validate(decoded).isEmpty) {
        return ProblemDetails.fromJson(decoded);
      }
    } on FormatException {
      // Not a problem document: fall through to a generic one.
    }
    return ProblemDetails(
      type: 'about:blank',
      title: 'HTTP ${response.statusCode}',
      status: response.statusCode,
      code: PlatformErrorCode.internalUnexpected.code,
    );
  }
}
