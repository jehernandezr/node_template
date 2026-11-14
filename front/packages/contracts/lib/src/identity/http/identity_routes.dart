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
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.body,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.AUTH.INVALID_CREDENTIALS',
      'PLATFORM.RATE_LIMIT.EXCEEDED',
    ],
    requiresAuth: false,
    permissions: <String>[],
    platformRoles: <String>[],
    encodeRequest: SignInRequest.encode,
    validateRequest: SignInRequestSchema.validate,
    validateResponse: SignInResponseSchema.validateIncoming,
    decodeResponse: SignInResponse.fromJson,
  );

  /// Crea un desafío MFA para el login pendiente y envía el código por el método elegido.
  ///
  /// `POST /v1/auth/mfa/challenges`
  static const requestMfaChallenge =
      RouteDescriptor<MfaChallengeRequest, MfaChallenge>(
        id: 'identity.auth.mfa-challenge',
        method: HttpMethod.post,
        path: '/v1/auth/mfa/challenges',
        version: 1,
        pathParams: <String>[],
        requestLocation: RequestLocation.body,
        successStatus: 201,
        errors: <String>[
          'IDENTITY.MFA.TOKEN_INVALID',
          'IDENTITY.MFA.METHOD_UNAVAILABLE',
          'IDENTITY.MFA.TOO_MANY_ATTEMPTS',
          'PLATFORM.RATE_LIMIT.EXCEEDED',
        ],
        requiresAuth: false,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: MfaChallengeRequest.encode,
        validateRequest: MfaChallengeRequestSchema.validate,
        validateResponse: MfaChallengeSchema.validateIncoming,
        decodeResponse: MfaChallenge.fromJson,
      );

  /// Verifica un desafío MFA, crea la sesión y registra el dispositivo nuevo.
  ///
  /// `POST /v1/auth/mfa/verify`
  static const verifyMfa = RouteDescriptor<MfaVerifyRequest, SignInResponse>(
    id: 'identity.auth.mfa-verify',
    method: HttpMethod.post,
    path: '/v1/auth/mfa/verify',
    version: 1,
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
    platformRoles: <String>[],
    encodeRequest: MfaVerifyRequest.encode,
    validateRequest: MfaVerifyRequestSchema.validate,
    validateResponse: SignInResponseSchema.validateIncoming,
    decodeResponse: SignInResponse.fromJson,
  );

  /// Rota el session token (cuerpo en móvil, cookie httpOnly en web) y emite un access token nuevo.
  ///
  /// `POST /v1/auth/refresh`
  static const refreshSession =
      RouteDescriptor<SessionTokenRequest, SessionTokens>(
        id: 'identity.auth.refresh',
        method: HttpMethod.post,
        path: '/v1/auth/refresh',
        version: 1,
        pathParams: <String>[],
        requestLocation: RequestLocation.body,
        successStatus: 200,
        errors: <String>[
          'PLATFORM.AUTH.UNAUTHENTICATED',
          'IDENTITY.SESSION.REVOKED',
          'IDENTITY.SESSION.EXPIRED',
          'IDENTITY.SESSION.REUSED',
          'IDENTITY.USER.SUSPENDED',
          'IDENTITY.TENANT.SUSPENDED',
          'PLATFORM.RATE_LIMIT.EXCEEDED',
        ],
        requiresAuth: false,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: SessionTokenRequest.encode,
        validateRequest: SessionTokenRequestSchema.validate,
        validateResponse: SessionTokensSchema.validateIncoming,
        decodeResponse: SessionTokens.fromJson,
      );

  /// Cierra la sesión del session token, revoca sus tokens y borra la cookie en web.
  ///
  /// `POST /v1/auth/sign-out`
  static const signOut = RouteDescriptor<SessionTokenRequest, void>(
    id: 'identity.auth.sign-out',
    method: HttpMethod.post,
    path: '/v1/auth/sign-out',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.body,
    successStatus: 204,
    errors: <String>['PLATFORM.RATE_LIMIT.EXCEEDED'],
    requiresAuth: false,
    permissions: <String>[],
    platformRoles: <String>[],
    encodeRequest: SessionTokenRequest.encode,
    validateRequest: SessionTokenRequestSchema.validate,
  );

  /// Abre el paso adicional (step-up) de la sesión actual y devuelve los métodos que ofrece.
  ///
  /// `POST /v1/me/step-up`
  static const startStepUp = RouteDescriptor<Empty, PendingMfa>(
    id: 'identity.step-up.start',
    method: HttpMethod.post,
    path: '/v1/me/step-up',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.body,
    successStatus: 201,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'PLATFORM.RATE_LIMIT.EXCEEDED',
    ],
    requiresAuth: true,
    permissions: <String>[],
    platformRoles: <String>[],
    encodeRequest: Empty.encode,
    validateRequest: EmptySchema.validate,
    validateResponse: PendingMfaSchema.validateIncoming,
    decodeResponse: PendingMfa.fromJson,
  );

  /// Crea el desafío del paso adicional y envía el código por el método elegido.
  ///
  /// `POST /v1/me/step-up/challenges`
  static const requestStepUpChallenge =
      RouteDescriptor<MfaChallengeRequest, MfaChallenge>(
        id: 'identity.step-up.challenge',
        method: HttpMethod.post,
        path: '/v1/me/step-up/challenges',
        version: 1,
        pathParams: <String>[],
        requestLocation: RequestLocation.body,
        successStatus: 201,
        errors: <String>[
          'IDENTITY.SESSION.REVOKED',
          'IDENTITY.SESSION.EXPIRED',
          'IDENTITY.TOKEN.REVOKED',
          'IDENTITY.USER.SUSPENDED',
          'IDENTITY.TENANT.SUSPENDED',
          'IDENTITY.TOKEN.STALE_PERMISSIONS',
          'IDENTITY.MFA.TOKEN_INVALID',
          'IDENTITY.MFA.METHOD_UNAVAILABLE',
          'IDENTITY.MFA.TOO_MANY_ATTEMPTS',
          'PLATFORM.RATE_LIMIT.EXCEEDED',
        ],
        requiresAuth: true,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: MfaChallengeRequest.encode,
        validateRequest: MfaChallengeRequestSchema.validate,
        validateResponse: MfaChallengeSchema.validateIncoming,
        decodeResponse: MfaChallenge.fromJson,
      );

  /// Verifica el paso adicional, actualiza el último MFA de la sesión y emite un access token nuevo.
  ///
  /// `POST /v1/me/step-up/verify`
  static const verifyStepUp =
      RouteDescriptor<StepUpVerifyRequest, StepUpResult>(
        id: 'identity.step-up.verify',
        method: HttpMethod.post,
        path: '/v1/me/step-up/verify',
        version: 1,
        pathParams: <String>[],
        requestLocation: RequestLocation.body,
        successStatus: 200,
        errors: <String>[
          'IDENTITY.SESSION.REVOKED',
          'IDENTITY.SESSION.EXPIRED',
          'IDENTITY.TOKEN.REVOKED',
          'IDENTITY.USER.SUSPENDED',
          'IDENTITY.TENANT.SUSPENDED',
          'IDENTITY.TOKEN.STALE_PERMISSIONS',
          'IDENTITY.MFA.TOKEN_INVALID',
          'IDENTITY.MFA.CODE_INVALID',
          'IDENTITY.MFA.CODE_EXPIRED',
          'IDENTITY.MFA.TOO_MANY_ATTEMPTS',
          'PLATFORM.RATE_LIMIT.EXCEEDED',
        ],
        requiresAuth: true,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: StepUpVerifyRequest.encode,
        validateRequest: StepUpVerifyRequestSchema.validate,
        validateResponse: StepUpResultSchema.validateIncoming,
        decodeResponse: StepUpResult.fromJson,
      );

  /// Devuelve usuario, tenant, permisos, roles, plan, flags y último MFA de la sesión actual.
  ///
  /// `GET /v1/me/access`
  static const getSessionAccess = RouteDescriptor<Empty, SessionAccess>(
    id: 'identity.me.access',
    method: HttpMethod.get,
    path: '/v1/me/access',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.query,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
    ],
    requiresAuth: true,
    permissions: <String>[],
    platformRoles: <String>[],
    encodeRequest: Empty.encode,
    validateRequest: EmptySchema.validate,
    validateResponse: SessionAccessSchema.validateIncoming,
    decodeResponse: SessionAccess.fromJson,
  );

  /// Lista las sesiones activas del usuario, la actual primero.
  ///
  /// `GET /v1/me/sessions`
  static const listSessions = RouteDescriptor<PageQuery, SessionPage>(
    id: 'identity.sessions.list',
    method: HttpMethod.get,
    path: '/v1/me/sessions',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.query,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
    ],
    requiresAuth: true,
    permissions: <String>[],
    platformRoles: <String>[],
    encodeRequest: PageQuery.encode,
    validateRequest: PageQuerySchema.validate,
    validateResponse: SessionPageSchema.validateIncoming,
    decodeResponse: SessionPage.fromJson,
  );

  /// Cierra una sesión del usuario y revoca sus tokens.
  ///
  /// `DELETE /v1/me/sessions/{sessionId}`
  static const revokeSession = RouteDescriptor<RevokeSessionRequest, void>(
    id: 'identity.sessions.revoke',
    method: HttpMethod.delete,
    path: '/v1/me/sessions/{sessionId}',
    version: 1,
    pathParams: <String>['sessionId'],
    requestLocation: RequestLocation.query,
    successStatus: 204,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'PLATFORM.RESOURCE.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>[],
    platformRoles: <String>[],
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
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.body,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
    ],
    requiresAuth: true,
    permissions: <String>[],
    platformRoles: <String>[],
    encodeRequest: Empty.encode,
    validateRequest: EmptySchema.validate,
    validateResponse: RevokedSessionsSchema.validateIncoming,
    decodeResponse: RevokedSessions.fromJson,
  );

  /// Lista los dispositivos del usuario con confianza vigente.
  ///
  /// `GET /v1/me/devices`
  static const listDevices = RouteDescriptor<PageQuery, DevicePage>(
    id: 'identity.devices.list',
    method: HttpMethod.get,
    path: '/v1/me/devices',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.query,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
    ],
    requiresAuth: true,
    permissions: <String>[],
    platformRoles: <String>[],
    encodeRequest: PageQuery.encode,
    validateRequest: PageQuerySchema.validate,
    validateResponse: DevicePageSchema.validateIncoming,
    decodeResponse: DevicePage.fromJson,
  );
}
