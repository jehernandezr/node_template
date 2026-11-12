// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

import '../../core/core.dart';
import '../../identity/schemas/identity_schemas.dart';
import '../../identity/types/identity_types.dart';
import '../../platform/enums/platform_enums.dart';
import '../../platform/schemas/platform_schemas.dart';
import '../../platform/types/platform_types.dart';

/// Rutas HTTP públicas del contrato `identity`.
abstract final class IdentityRoutes {
  /// Inicia sesión con email y contraseña. Responde tokens o un desafío MFA.
  ///
  /// `POST /v1/auth/sign-in`
  static const signIn = RouteDescriptor<SignInRequest, SignInResponse>(
    id: 'identity.auth.sign-in',
    method: HttpMethod.post,
    path: '/v1/auth/sign-in',
    pathParams: <String>[],
    requestLocation: RequestLocation.body,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.AUTH.INVALID_CREDENTIALS',
      'PLATFORM.RATE_LIMIT.EXCEEDED',
    ],
    requiresAuth: false,
    permissions: <String>[],
    encodeRequest: SignInRequest.encode,
    validateRequest: SignInRequestSchema.validate,
    validateResponse: SignInResponseSchema.validate,
    decodeResponse: SignInResponse.fromJson,
  );

  /// Verifica un desafío MFA, crea la sesión y registra el dispositivo nuevo.
  ///
  /// `POST /v1/auth/mfa/verify`
  static const verifyMfa = RouteDescriptor<MfaVerifyRequest, SignInResponse>(
    id: 'identity.auth.mfa-verify',
    method: HttpMethod.post,
    path: '/v1/auth/mfa/verify',
    pathParams: <String>[],
    requestLocation: RequestLocation.body,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.MFA.TOKEN_INVALID',
      'IDENTITY.MFA.CODE_INVALID',
      'IDENTITY.MFA.CODE_EXPIRED',
      'IDENTITY.MFA.TOO_MANY_ATTEMPTS',
      'PLATFORM.RATE_LIMIT.EXCEEDED',
    ],
    requiresAuth: false,
    permissions: <String>[],
    encodeRequest: MfaVerifyRequest.encode,
    validateRequest: MfaVerifyRequestSchema.validate,
    validateResponse: SignInResponseSchema.validate,
    decodeResponse: SignInResponse.fromJson,
  );

  /// Lista las sesiones activas del usuario, la actual primero.
  ///
  /// `GET /v1/me/sessions`
  static const listSessions = RouteDescriptor<PageQuery, SessionPage>(
    id: 'identity.sessions.list',
    method: HttpMethod.get,
    path: '/v1/me/sessions',
    pathParams: <String>[],
    requestLocation: RequestLocation.query,
    successStatus: 200,
    errors: <String>['IDENTITY.SESSION.REVOKED'],
    requiresAuth: true,
    permissions: <String>[],
    encodeRequest: PageQuery.encode,
    validateRequest: PageQuerySchema.validate,
    validateResponse: SessionPageSchema.validate,
    decodeResponse: SessionPage.fromJson,
  );

  /// Cierra una sesión del usuario y revoca sus tokens.
  ///
  /// `DELETE /v1/me/sessions/{sessionId}`
  static const revokeSession = RouteDescriptor<RevokeSessionRequest, void>(
    id: 'identity.sessions.revoke',
    method: HttpMethod.delete,
    path: '/v1/me/sessions/{sessionId}',
    pathParams: <String>['sessionId'],
    requestLocation: RequestLocation.query,
    successStatus: 204,
    errors: <String>['PLATFORM.RESOURCE.NOT_FOUND', 'IDENTITY.SESSION.REVOKED'],
    requiresAuth: true,
    permissions: <String>[],
    encodeRequest: RevokeSessionRequest.encode,
    validateRequest: RevokeSessionRequestSchema.validate,
  );

  /// Cierra todas las sesiones del usuario menos la actual.
  ///
  /// `POST /v1/me/sessions/revoke-others`
  static const revokeOtherSessions = RouteDescriptor<Empty, RevokedSessions>(
    id: 'identity.sessions.revoke-others',
    method: HttpMethod.post,
    path: '/v1/me/sessions/revoke-others',
    pathParams: <String>[],
    requestLocation: RequestLocation.body,
    successStatus: 200,
    errors: <String>['IDENTITY.SESSION.REVOKED'],
    requiresAuth: true,
    permissions: <String>[],
    encodeRequest: Empty.encode,
    validateRequest: EmptySchema.validate,
    validateResponse: RevokedSessionsSchema.validate,
    decodeResponse: RevokedSessions.fromJson,
  );

  /// Lista los dispositivos del usuario con confianza vigente.
  ///
  /// `GET /v1/me/devices`
  static const listDevices = RouteDescriptor<PageQuery, DevicePage>(
    id: 'identity.devices.list',
    method: HttpMethod.get,
    path: '/v1/me/devices',
    pathParams: <String>[],
    requestLocation: RequestLocation.query,
    successStatus: 200,
    errors: <String>['IDENTITY.SESSION.REVOKED'],
    requiresAuth: true,
    permissions: <String>[],
    encodeRequest: PageQuery.encode,
    validateRequest: PageQuerySchema.validate,
    validateResponse: DevicePageSchema.validate,
    decodeResponse: DevicePage.fromJson,
  );
}
