import 'package:contracts/contracts.dart';

/// Problem responses that tests of failing calls share.
abstract final class ProblemFixtures {
  /// 503 with `PLATFORM.INTERNAL.UNEXPECTED`.
  static ProblemDetails unavailable({String traceId = 'trace-123'}) =>
      ProblemDetails(
        type: 'about:blank',
        title: 'Service unavailable',
        status: 503,
        code: PlatformErrorCode.internalUnexpected.code,
        traceId: traceId,
      );

  /// 403 with `PLATFORM.AUTH.FORBIDDEN`.
  static ProblemDetails forbidden({String traceId = 'trace-123'}) =>
      ProblemDetails(
        type: 'about:blank',
        title: 'Forbidden',
        status: 403,
        code: PlatformErrorCode.authForbidden.code,
        traceId: traceId,
      );

  /// 404 with `PLATFORM.RESOURCE.NOT_FOUND`.
  static ProblemDetails notFound({String traceId = 'trace-123'}) =>
      ProblemDetails(
        type: 'about:blank',
        title: 'Not found',
        status: 404,
        code: PlatformErrorCode.resourceNotFound.code,
        traceId: traceId,
      );

  /// A problem with the public [code] and [status].
  static ProblemDetails withCode(String code, {int status = 400}) =>
      ProblemDetails(
        type: 'about:blank',
        title: 'Problem',
        status: status,
        code: code,
        traceId: 'trace-123',
      );
}
