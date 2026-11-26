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
  /// Refreshes the session with [refresh] for the requests [appliesTo] accepts.
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
/// A `PLATFORM.SHARDING.WRONG_REGION` answer (421) means the tenant lives in
/// another region: the client repeats the request once against
/// `details.apiBaseUrl` and keeps that base for the next calls.
///
/// A successful answer must carry the route's `successStatus`; a deprecated
/// route is logged once per client so the migration does not wait for the
/// sunset.
class ApiClient {
  /// Client over [HttpTransport] that validates each request against its contract and refreshes the session when needed.
  ApiClient({
    required this.transport,
    required this._baseUri,
    this.accessToken,
    this.sessionRefresh,
    this.defaultHeaders = const {},
  });

  /// Port that sends the HTTP requests.
  final HttpTransport transport;

  /// Base of every route path, for example `https://api.example.com`. It
  /// changes to the API of the tenant's region after a wrong-region answer.
  Uri get baseUri => _baseUri;
  Uri _baseUri;

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
  /// [headers] go on every attempt of this call, over [defaultHeaders]; the
  /// access token and the content type are never replaced by them.
  ///
  /// Throws [ContractViolationException] when the request or the response
  /// break the contract, and [ApiErrorException] when the API answers an error.
  ///
  /// Routes without a body are `RouteDescriptor<Req, void>`.
  Future<Res> send<Req, Res>(
    RouteDescriptor<Req, Res> route,
    Req request, {
    Map<String, String> headers = const {},
  }) async {
    final json = route.encodeRequest(request);
    final errors = route.validateRequest(json);
    if (errors.isNotEmpty) {
      throw ContractViolationException(routeId: route.id, errors: errors);
    }

    _reportDeprecation(route);

    var (uri, body) = _encode(route, json);
    var response = await _dispatch(route, uri, body, headers);
    final region = _regionBaseOf(response);
    if (region != null) {
      _baseUri = region;
      (uri, body) = _encode(route, json);
      response = await _dispatch(route, uri, body, headers);
    }
    final policy = sessionRefresh;
    if (policy != null && route.requiresAuth && !_isSuccess(response)) {
      if (policy.appliesTo(_problemOf(response))) {
        await policy.refresh();
        response = await _dispatch(route, uri, body, headers);
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
    Map<String, String> extraHeaders,
  ) async {
    final headers = <String, String>{
      'accept': 'application/json, application/problem+json',
      ...defaultHeaders,
      ...extraHeaders,
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

  /// The API of the tenant's region when [response] is a wrong-region answer
  /// with a usable `apiBaseUrl`, or null.
  ///
  /// Only an absolute `https` URL is followed, or `http` while the current
  /// base is `http` (a local deployment): the token never travels to a
  /// weaker scheme than the one it was given for.
  Uri? _regionBaseOf(TransportResponse response) {
    if (response.statusCode !=
        PlatformErrorCode.shardingWrongRegion.httpStatus) {
      return null;
    }
    final problem = _problemOf(response);
    if (problem.code != PlatformErrorCode.shardingWrongRegion.code) {
      return null;
    }
    final target = Uri.tryParse(problem.details?.apiBaseUrl ?? '');
    if (target == null || !target.isAbsolute || target.host.isEmpty) {
      return null;
    }
    final allowed =
        target.scheme == 'https' ||
        (target.scheme == 'http' && _baseUri.scheme == 'http');
    return allowed && target != _baseUri ? target : null;
  }

  static bool _isSuccess(TransportResponse response) =>
      response.statusCode >= 200 && response.statusCode <= 299;

  /// The contract's canonical form: numbers in JSON notation, booleans as true/false and lists as a repeated parameter.
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
    final base = _baseUri;
    final basePath = base.path.endsWith('/')
        ? base.path.substring(0, base.path.length - 1)
        : base.path;
    if (route.requestLocation == RequestLocation.body) {
      return (base.replace(path: '$basePath$path'), jsonEncode(rest));
    }
    final query = encodeQuery(rest);
    return (
      base.replace(
        path: '$basePath$path',
        queryParameters: query.isEmpty ? null : query,
      ),
      null,
    );
  }

  /// Not a problem document: fall through to a generic one.
  ProblemDetails _problemOf(TransportResponse response) {
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map<String, dynamic> &&
          ProblemDetailsSchema.validate(decoded).isEmpty) {
        return ProblemDetails.fromJson(decoded);
      }
    } on FormatException {
      return _genericProblem(response);
    }
    return _genericProblem(response);
  }

  ProblemDetails _genericProblem(TransportResponse response) {
    return ProblemDetails(
      type: 'about:blank',
      title: 'HTTP ${response.statusCode}',
      status: response.statusCode,
      code: PlatformErrorCode.internalUnexpected.code,
    );
  }
}
