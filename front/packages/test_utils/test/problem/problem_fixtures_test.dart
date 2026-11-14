import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:test_utils/test_utils.dart';

void main() {
  group(ProblemFixtures, () {
    test('unavailable matches the literal it replaces', () {
      final literal = ProblemDetails(
        type: 'about:blank',
        title: 'Service unavailable',
        status: 503,
        code: PlatformErrorCode.internalUnexpected.code,
        traceId: 'trace-123',
      );

      expect(ProblemFixtures.unavailable().toJson(), literal.toJson());
    });

    test('unavailable is a 503 internal error', () {
      final problem = ProblemFixtures.unavailable();

      expect(problem.status, 503);
      expect(problem.code, PlatformErrorCode.internalUnexpected.code);
    });

    test('forbidden is a 403 auth error', () {
      final problem = ProblemFixtures.forbidden();

      expect(problem.status, 403);
      expect(problem.code, PlatformErrorCode.authForbidden.code);
    });

    test('notFound is a 404 resource error', () {
      final problem = ProblemFixtures.notFound();

      expect(problem.status, 404);
      expect(problem.code, PlatformErrorCode.resourceNotFound.code);
    });

    test('the fixtures carry the default trace id', () {
      expect(ProblemFixtures.unavailable().traceId, 'trace-123');
      expect(ProblemFixtures.forbidden().traceId, 'trace-123');
      expect(ProblemFixtures.notFound().traceId, 'trace-123');
    });

    test('the fixtures take the trace id they are given', () {
      expect(ProblemFixtures.unavailable(traceId: 'other').traceId, 'other');
      expect(ProblemFixtures.forbidden(traceId: 'other').traceId, 'other');
      expect(ProblemFixtures.notFound(traceId: 'other').traceId, 'other');
    });

    test('withCode uses the code with a 400 status by default', () {
      final problem = ProblemFixtures.withCode(
        IdentityErrorCode.mfaCodeExpired.code,
      );

      expect(problem.status, 400);
      expect(problem.code, IdentityErrorCode.mfaCodeExpired.code);
    });

    test('withCode takes the status it is given', () {
      final problem = ProblemFixtures.withCode(
        IdentityErrorCode.mfaCodeExpired.code,
        status: 409,
      );

      expect(problem.status, 409);
    });
  });
}
