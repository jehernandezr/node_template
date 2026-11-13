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

/// Deprecation of a route. The server answers `Deprecation`, `Sunset` and
/// `Link` headers, and `410` with `PLATFORM.API.VERSION_SUNSET` after [sunset].
@immutable
final class RouteDeprecation {
  /// Creates a deprecation. Dates are `YYYY-MM-DD`, as in the contract.
  const RouteDeprecation({
    required this.since,
    required this.sunset,
    this.replacement,
  });

  /// Date (`YYYY-MM-DD`) since which the route is deprecated.
  final String since;

  /// Date (`YYYY-MM-DD`) when the route stops answering.
  final String sunset;

  /// Id of the route that replaces this one, if any.
  final String? replacement;

  /// [sunset] as a UTC date.
  DateTime get sunsetDate => DateTime.parse('${sunset}T00:00:00Z');

  /// True when [now] is on or after [sunset].
  bool isSunset(DateTime now) => !now.toUtc().isBefore(sunsetDate);
}

/// Generated description of a public HTTP route: method, path, request and
/// response types, validators, access and declared error codes.
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
    this.version = 1,
    this.platformRoles = const [],
    this.mfaMaxAgeMinutes,
    this.deprecated,
    this.validateResponse,
    this.decodeResponse,
  });

  /// Stable id, for example `identity.auth.sign-in`.
  final String id;

  final HttpMethod method;

  /// Path with params in braces, for example `/v1/me/sessions/{sessionId}`.
  final String path;

  /// Major API version, the `/vN` that starts [path].
  final int version;

  /// Request fields that go in [path].
  final List<String> pathParams;

  final RequestLocation requestLocation;

  /// Status of a successful answer. 204 has no body.
  final int successStatus;

  /// Error codes the route declares, besides the validation ones.
  final List<String> errors;

  /// True when the route needs an access token.
  final bool requiresAuth;

  /// Permissions (wire codes of `Permission`) the user needs in the active
  /// tenant, all of them.
  final List<String> permissions;

  /// Platform roles (wire codes of `PlatformRole`) accepted, any of them.
  final List<String> platformRoles;

  /// Maximum age in minutes of the last second factor (step-up), or null.
  final int? mfaMaxAgeMinutes;

  /// Present when the route is deprecated.
  final RouteDeprecation? deprecated;

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

/// Encodes the JSON of the query fields as query parameters, with the text
/// the backend decodes back to the contract type (`decodeQuery` in
/// `@contracts/platform`): numbers in JSON notation, booleans as `true` or
/// `false`, lists as a repeated parameter. Null fields are left out.
///
/// The contract only allows scalars and lists of scalars in the query; any
/// other value throws an [ArgumentError].
Map<String, List<String>> encodeQuery(Map<String, dynamic> fields) {
  String text(String name, Object value) => switch (value) {
    String() => value,
    bool() => value ? 'true' : 'false',
    int() => '$value',
    double() when value.isFinite =>
      value == value.truncateToDouble() && value.abs() < 1e15
          ? '${value.toInt()}'
          : '$value',
    _ => throw ArgumentError.value(
      value,
      name,
      'Only scalars and lists of scalars travel in the query',
    ),
  };
  return {
    for (final entry in fields.entries)
      if (entry.value != null)
        entry.key: entry.value is List
            ? [
                for (final item in entry.value as List)
                  if (item != null) text(entry.key, item as Object),
              ]
            : [text(entry.key, entry.value as Object)],
  };
}
