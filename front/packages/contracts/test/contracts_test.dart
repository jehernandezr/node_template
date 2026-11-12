import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('PlatformErrorCode', () {
    test('fromCode returns the matching value', () {
      expect(
        PlatformErrorCode.fromCode('PLATFORM.AUTH.FORBIDDEN'),
        PlatformErrorCode.authForbidden,
      );
    });

    test('fromCode returns null for unknown codes', () {
      expect(PlatformErrorCode.fromCode('PLATFORM.UNKNOWN.CODE'), isNull);
      expect(PlatformErrorCode.fromCode(''), isNull);
    });

    test('codes are unique', () {
      final codes = PlatformErrorCode.values.map((value) => value.code).toSet();
      expect(codes, hasLength(PlatformErrorCode.values.length));
    });
  });

  group('ProblemDetails', () {
    final json = <String, dynamic>{
      'type': 'https://errors.example/platform/validation',
      'title': 'Invalid input',
      'status': 400,
      'detail': 'The title is required.',
      'instance': '/tasks/1',
      'code': 'PLATFORM.VALIDATION.INVALID_INPUT',
      'traceId': 'trace-1',
      'errors': [
        {
          'field': 'title',
          'code': 'PLATFORM.VALIDATION.REQUIRED',
          'message': 'Required',
        },
        {'code': 'PLATFORM.VALIDATION.INVALID_INPUT'},
      ],
    };

    test('fromJson parses every member', () {
      final problem = ProblemDetails.fromJson(json);

      expect(problem.type, 'https://errors.example/platform/validation');
      expect(problem.status, 400);
      expect(problem.detail, 'The title is required.');
      expect(problem.traceId, 'trace-1');
      expect(problem.errors, const [
        FieldError(
          field: 'title',
          code: 'PLATFORM.VALIDATION.REQUIRED',
          message: 'Required',
        ),
        FieldError(code: 'PLATFORM.VALIDATION.INVALID_INPUT'),
      ]);
    });

    test('fromJson defaults errors to empty and optional members to null', () {
      final problem = ProblemDetails.fromJson({
        'type': 'about:blank',
        'title': 'Not found',
        'status': 404,
        'code': 'PLATFORM.RESOURCE.NOT_FOUND',
      });

      expect(problem.errors, isEmpty);
      expect(problem.detail, isNull);
      expect(problem.instance, isNull);
      expect(problem.traceId, isNull);
    });

    test(
      'fromJson throws FormatException when a required member is missing',
      () {
        expect(
          () => ProblemDetails.fromJson({
            'title': 'x',
            'status': 400,
            'code': 'c',
          }),
          throwsFormatException,
        );
      },
    );

    test('toJson round-trips through fromJson', () {
      final problem = ProblemDetails.fromJson(json);
      expect(
        ProblemDetails.fromJson(problem.toJson()).toJson(),
        problem.toJson(),
      );
    });

    test('toJson omits null members', () {
      const problem = ProblemDetails(
        type: 'about:blank',
        title: 'Conflict',
        status: 409,
        code: 'PLATFORM.CONFLICT.VERSION_MISMATCH',
      );
      expect(problem.toJson().containsKey('detail'), isFalse);
      expect(problem.toJson().containsKey('traceId'), isFalse);
      expect(problem.toJson()['errors'], isEmpty);
    });
  });

  group('ApiErrorException', () {
    test('exposes the known platform code', () {
      const exception = ApiErrorException(
        ProblemDetails(
          type: 'about:blank',
          title: 'Forbidden',
          status: 403,
          code: 'PLATFORM.AUTH.FORBIDDEN',
        ),
      );
      expect(exception.platformCode, PlatformErrorCode.authForbidden);
    });

    test('platformCode is null for codes the client does not know', () {
      const exception = ApiErrorException(
        ProblemDetails(
          type: 'about:blank',
          title: 'Other',
          status: 400,
          code: 'TASKS.ITEM.LOCKED',
        ),
      );
      expect(exception.platformCode, isNull);
      expect(exception.problem.code, 'TASKS.ITEM.LOCKED');
    });
  });
}
