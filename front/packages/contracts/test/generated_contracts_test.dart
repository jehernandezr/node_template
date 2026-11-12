import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';

const _sessionId = '0193f1c2-0000-7000-8000-000000000000';

List<(String?, String)> _pairs(List<FieldError> errors) => [
  for (final e in errors) (e.field, e.code),
];

void main() {
  group('generated types', () {
    test('SignInResponse round-trips through JSON with enums and dates', () {
      final json = <String, dynamic>{
        'status': 'mfa_required',
        'mfa': {
          'mfaToken': 'token',
          'methods': ['device_otp', 'email_otp'],
        },
      };
      final response = SignInResponse.fromJson(json);
      expect(response.status, SignInStatus.mfaRequired);
      expect(response.mfa?.methods, [MfaFactor.deviceOtp, MfaFactor.emailOtp]);
      expect(response.tokens, isNull);
      expect(response.toJson(), json);
      expect(SignInResponse.fromJson(response.toJson()), response);
      expect(
        SignInResponse.fromJson(response.toJson()).hashCode,
        response.hashCode,
      );
    });

    test(
      'unknown enum values in lists are skipped for forward compatibility',
      () {
        final mfa = PendingMfa.fromJson({
          'mfaToken': 't',
          'methods': ['device_otp', 'retina_scan'],
        });
        expect(mfa.methods, [MfaFactor.deviceOtp]);
      },
    );

    test(
      'a required unknown enum value or a wrong type throws FormatException',
      () {
        expect(
          () => SignInResponse.fromJson({'status': 'other'}),
          throwsFormatException,
        );
        expect(() => SessionSummary.fromJson({'id': 1}), throwsFormatException);
      },
    );

    test(
      'dates are written in UTC ISO 8601 and nullable fields stay in the JSON',
      () {
        final page = SessionPage(
          items: [
            SessionSummary(
              id: _sessionId,
              deviceName: 'iPhone · Safari',
              platform: ClientPlatform.ios,
              lastSeenAt: DateTime.utc(2026, 11, 12, 10),
              current: true,
            ),
          ],
          nextCursor: null,
        );
        final json = page.toJson();
        expect(json['nextCursor'], isNull);
        expect(json.containsKey('nextCursor'), isTrue);
        expect(
          (json['items'] as List).single['lastSeenAt'],
          '2026-11-12T10:00:00.000Z',
        );
        expect(SessionPageSchema.validate(json), isEmpty);
      },
    );
  });

  group('generated validators', () {
    test('a valid request has no errors', () {
      const request = SignInRequest(email: 'ana@example.com', password: 'x');
      expect(request.validate(), isEmpty);
    });

    test('match the field errors the server returns', () {
      // Same case as backend/libs/contracts/identity/src/contract.spec.ts.
      expect(
        _pairs(
          SignInRequestSchema.validate({
            'email': 'not-an-email',
            'password': '',
          }),
        ),
        [
          ('email', PlatformErrorCode.validationInvalidFormat.code),
          ('password', PlatformErrorCode.validationTooShort.code),
        ],
      );
      expect(_pairs(PageQuerySchema.validate({'limit': 500})), [
        ('limit', PlatformErrorCode.validationTooLarge.code),
      ]);
    });

    test('report missing, mistyped, unknown and enum errors', () {
      expect(
        _pairs(
          MfaVerifyRequestSchema.validate({
            'method': 'fax',
            'code': 12345678,
            'extra': true,
          }),
        ),
        [
          ('mfaToken', PlatformErrorCode.validationRequired.code),
          ('method', PlatformErrorCode.validationInvalidEnum.code),
          ('code', PlatformErrorCode.validationInvalidType.code),
          ('extra', PlatformErrorCode.validationUnknownField.code),
        ],
      );
    });

    test('use dotted paths for nested objects and array items', () {
      final errors = SessionPageSchema.validate({
        'items': [
          {
            'id': _sessionId,
            'deviceName': 'Mac',
            'platform': 'macos',
            'lastSeenAt': '2026-11-12T10:00:00Z',
            'current': false,
          },
          {
            'id': 'not-a-uuid',
            'deviceName': '',
            'platform': 'macos',
            'lastSeenAt': 'yesterday',
            'current': 'no',
          },
        ],
        'nextCursor': null,
      });
      expect(_pairs(errors), [
        ('items.1.id', PlatformErrorCode.validationInvalidFormat.code),
        ('items.1.deviceName', PlatformErrorCode.validationTooShort.code),
        ('items.1.lastSeenAt', PlatformErrorCode.validationInvalidFormat.code),
        ('items.1.current', PlatformErrorCode.validationInvalidType.code),
      ]);
    });

    test('check integers, bounds, nullability and the root type', () {
      expect(
        _pairs(
          MoneyAmountSchema.validate({'amountMinor': 1.5, 'currency': 'COP'}),
        ),
        [('amountMinor', PlatformErrorCode.validationInvalidType.code)],
      );
      expect(
        MoneyAmountSchema.validate({'amountMinor': 2.0, 'currency': 'COP'}),
        isEmpty,
      );
      expect(_pairs(RevokedSessionsSchema.validate({'revoked': -1})), [
        ('revoked', PlatformErrorCode.validationTooSmall.code),
      ]);
      expect(_pairs(SessionPageSchema.validate({'items': []})), [
        ('nextCursor', PlatformErrorCode.validationRequired.code),
      ]);
      expect(_pairs(EmptySchema.validate('x')), [
        (null, PlatformErrorCode.validationInvalidType.code),
      ]);
      expect(
        _pairs(PageQuerySchema.validate({'after': 'a+b'}, path: 'query')),
        [('query.after', PlatformErrorCode.validationInvalidFormat.code)],
      );
    });

    test('validate core problem documents too', () {
      const problem = ProblemDetails(
        type: 'about:blank',
        title: 'Not found',
        status: 404,
        code: 'PLATFORM.RESOURCE.NOT_FOUND',
      );
      expect(ProblemDetailsSchema.validate(problem.toJson()), isEmpty);
      expect(
        _pairs(
          ProblemDetailsSchema.validate({...problem.toJson(), 'status': 200}),
        ),
        [('status', PlatformErrorCode.validationTooSmall.code)],
      );
    });
  });

  group('generated routes and enums', () {
    test('describe method, path, params and declared errors', () {
      const route = IdentityRoutes.revokeSession;
      expect(route.method, HttpMethod.delete);
      expect(route.path, '/v1/me/sessions/{sessionId}');
      expect(route.pathParams, ['sessionId']);
      expect(route.requestLocation, RequestLocation.query);
      expect(route.successStatus, 204);
      expect(route.decodeResponse, isNull);
      expect(route.requiresAuth, isTrue);
      expect(IdentityRoutes.signIn.requiresAuth, isFalse);
      expect(
        IdentityRoutes.verifyMfa.errors,
        contains(IdentityErrorCode.mfaCodeExpired.code),
      );
    });

    test('error enums carry the catalog metadata', () {
      expect(PlatformErrorCode.shardingTenantMigrating.httpStatus, 503);
      expect(PlatformErrorCode.shardingTenantMigrating.retryable, isTrue);
      expect(
        IdentityErrorCode.fromCode('IDENTITY.MFA.CODE_EXPIRED')?.messageKey,
        'error_identity_mfa_code_expired',
      );
      expect(PlatformErrorCode.tryParse('PLATFORM.SAGA.LEASE_LOST'), isNull);
    });

    test('constants come from the contract', () {
      expect(Pagination.maxLimit, 100);
      expect(MfaRules.deviceCodeLength, 8);
      expect(RegExp(IdentifierFormat.pattern).hasMatch(_sessionId), isTrue);
    });
  });
}
