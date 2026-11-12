import 'package:meta/meta.dart';

import '../platform/enums/platform_enums.dart';
import 'problem_details.dart';

/// Where the request fields that are not path params travel.
enum RequestLocation {
  /// Query string (GET and DELETE).
  query,

  /// JSON body (POST, PUT and PATCH).
  body,
}

/// Generated description of a public HTTP route: method, path, request and
/// response types, validators and declared error codes.
@immutable
final class RouteDescriptor<Req, Res> {
  /// Creates a descriptor. The generated code builds them as constants.
  const RouteDescriptor({
    required this.id,
    required this.method,
    required this.path,
    required this.pathParams,
    required this.requestLocation,
    required this.successStatus,
    required this.errors,
    required this.requiresAuth,
    required this.permissions,
    required this.encodeRequest,
    required this.validateRequest,
    this.validateResponse,
    this.decodeResponse,
  });

  /// Stable id, for example `identity.auth.sign-in`.
  final String id;

  final HttpMethod method;

  /// Path with params in braces, for example `/v1/me/sessions/{sessionId}`.
  final String path;

  /// Request fields that go in [path].
  final List<String> pathParams;

  final RequestLocation requestLocation;

  /// Status of a successful answer. 204 has no body.
  final int successStatus;

  /// Error codes the route declares, besides the validation ones.
  final List<String> errors;

  /// True when the route needs an access token.
  final bool requiresAuth;

  /// Permissions the user needs in the active tenant.
  final List<String> permissions;

  /// Serializes the request to JSON.
  final Map<String, dynamic> Function(Req request) encodeRequest;

  /// Validates the request JSON against the contract.
  final List<FieldError> Function(Object? json, {String path}) validateRequest;

  /// Validates the response JSON. Null when the route has no body.
  final List<FieldError> Function(Object? json, {String path})?
  validateResponse;

  /// Decodes the response JSON. Null when the route has no body.
  final Res Function(Map<String, dynamic> json)? decodeResponse;
}
