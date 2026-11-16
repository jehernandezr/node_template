import 'dart:convert';
import 'dart:developer' as developer;

import 'package:contracts/contracts.dart';

import 'http_transport.dart';

/// Returns the current access token, or null when there is no session.
typedef AccessTokenProvider = Future<String?> Function();

/// When and how to refresh the session after an authenticated route fails.
///
/// The client knows no service: the owner of the session decides which
/// problems mean "the token is valid but out of date".
final class SessionRefreshPolicy {
  const SessionRefreshPolicy({required this.appliesTo, required this.refresh});

  /// Whether [ProblemDetails] of a failed authenticated route asks for a
  /// refresh and one retry.
  final bool Function(ProblemDetails problem) appliesTo;

  /// Refreshes the session. The retry reads the new token afterwards.
  final Future<void> Function() refresh;
}

/// Client for the public routes of the contracts.
///
/// Every call validates the request with the generated validator before it
/// touches the network: an invalid request throws [ContractViolationException]
/// with the same field errors the server would return, and the transport is
/// never called. Error answers become [ApiErrorException] and successful
/// answers are validated and decoded into the generated response type.
///
/// A route that requires a session fails with
/// `PLATFORM.AUTH.UNAUTHENTICATED` before reaching the network when there is
/// no access token. An error that [sessionRefresh] accepts refreshes the
/// session and retries the request once with the new token.
///
/// A successful answer must carry the route's `successStatus`; a deprecated
/// route is logged once per client so the migration does not wait for the
/// sunset.
class ApiClient {
  ApiClient({
    required this.transport,
    required this.baseUri,
    this.accessToken,
    this.sessionRefresh,
    this.defaultHeaders = const {},
  });

  /// Port that sends the HTTP requests.
  final HttpTransport transport;

  /// Base of every route path, for example `https://api.example.com`.
  final Uri baseUri;

  /// Source of the access token for routes that need a session.
  final AccessTokenProvider? accessToken;

  /// Refresh and retry of authenticated routes. When null, every error is
  /// thrown as an [ApiErrorException].
  final SessionRefreshPolicy? sessionRefresh;

  /// Headers added to every request, for example `accept-language`.
  final Map<String, String> defaultHeaders;

  final Set<String> _reportedDeprecations = {};

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

    _reportDeprecation(route);

    final (uri, body) = _encode(route, json);
    var response = await _dispatch(route, uri, body);
    final policy = sessionRefresh;
    if (policy != null && route.requiresAuth && !_isSuccess(response)) {
      if (policy.appliesTo(_problemOf(response))) {
        await policy.refresh();
        response = await _dispatch(route, uri, body);
      }
    }

    if (!_isSuccess(response)) {
      throw ApiErrorException(_problemOf(response));
    }
    if (response.statusCode != route.successStatus) {
      throw ContractViolationException(
        routeId: route.id,
        errors: [
          FieldError(code: PlatformErrorCode.validationInvalidInput.code),
        ],
        inResponse: true,
      );
    }
    final decode = route.decodeResponse;
    // Routes without a body are `RouteDescriptor<Req, void>`.
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

  /// Sends one attempt of [route], adding the token when the route needs it.
  Future<TransportResponse> _dispatch<Req, Res>(
    RouteDescriptor<Req, Res> route,
    Uri uri,
    String? body,
  ) async {
    final headers = <String, String>{
      'accept': 'application/json, application/problem+json',
      ...defaultHeaders,
    };
    if (route.requiresAuth) {
      final token = await accessToken?.call();
      if (token == null) {
        throw ApiErrorException(
          ProblemDetails(
            type: 'about:blank',
            title: 'Unauthenticated',
            status: PlatformErrorCode.authUnauthenticated.httpStatus,
            code: PlatformErrorCode.authUnauthenticated.code,
          ),
        );
      }
      headers['authorization'] = 'Bearer $token';
    }
    if (body != null) headers['content-type'] = 'application/json';
    return transport.send(
      TransportRequest(
        method: route.method.wireCode,
        uri: uri,
        headers: headers,
        body: body,
      ),
    );
  }

  static bool _isSuccess(TransportResponse response) =>
      response.statusCode >= 200 && response.statusCode <= 299;

  void _reportDeprecation<Req, Res>(RouteDescriptor<Req, Res> route) {
    final deprecation = route.deprecated;
    if (deprecation == null || !_reportedDeprecations.add(route.id)) return;
    final replacement = deprecation.replacement;
    developer.log(
      'Route ${route.id} is deprecated since ${deprecation.since} and stops '
      'answering on ${deprecation.sunset}'
      '${replacement == null ? '' : '; use $replacement'}.',
      name: 'api',
      level: 900,
    );
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
    // The contract's canonical form: numbers in JSON notation, booleans as
    // true/false and lists as a repeated parameter.
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
