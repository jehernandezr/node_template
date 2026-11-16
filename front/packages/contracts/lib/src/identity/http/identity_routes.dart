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

  /// Registra un usuario y envía el email de verificación. Responde aceptado sin revelar si el email ya existe.
  ///
  /// `POST /v1/auth/sign-up`
  static const signUp = RouteDescriptor<SignUpRequest, void>(
    id: 'identity.auth.sign-up',
    method: HttpMethod.post,
    path: '/v1/auth/sign-up',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.body,
    successStatus: 202,
    errors: <String>[
      'IDENTITY.PASSWORD.POLICY_VIOLATION',
      'IDENTITY.PASSWORD.BREACHED',
      'IDENTITY.INVITATION.INVALID',
      'PLATFORM.RATE_LIMIT.EXCEEDED',
    ],
    requiresAuth: false,
    permissions: <String>[],
    platformRoles: <String>[],
    encodeRequest: SignUpRequest.encode,
    validateRequest: SignUpRequestSchema.validate,
  );

  /// Envía un nuevo email de verificación. Responde aceptado aunque el email no exista.
  ///
  /// `POST /v1/auth/email-verifications`
  static const resendEmailVerification =
      RouteDescriptor<EmailVerificationRequest, void>(
        id: 'identity.auth.email-verification-resend',
        method: HttpMethod.post,
        path: '/v1/auth/email-verifications',
        version: 1,
        pathParams: <String>[],
        requestLocation: RequestLocation.body,
        successStatus: 202,
        errors: <String>['PLATFORM.RATE_LIMIT.EXCEEDED'],
        requiresAuth: false,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: EmailVerificationRequest.encode,
        validateRequest: EmailVerificationRequestSchema.validate,
      );

  /// Marca el email del usuario como verificado con el token recibido.
  ///
  /// `POST /v1/auth/email-verifications/confirm`
  static const confirmEmailVerification =
      RouteDescriptor<EmailVerificationConfirmRequest, void>(
        id: 'identity.auth.email-verification-confirm',
        method: HttpMethod.post,
        path: '/v1/auth/email-verifications/confirm',
        version: 1,
        pathParams: <String>[],
        requestLocation: RequestLocation.body,
        successStatus: 204,
        errors: <String>[
          'IDENTITY.USER.EMAIL_VERIFICATION_INVALID',
          'PLATFORM.RATE_LIMIT.EXCEEDED',
        ],
        requiresAuth: false,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: EmailVerificationConfirmRequest.encode,
        validateRequest: EmailVerificationConfirmRequestSchema.validate,
      );

  /// Cambia la contraseña y cierra las demás sesiones del usuario.
  ///
  /// `POST /v1/me/password`
  static const changePassword = RouteDescriptor<ChangePasswordRequest, void>(
    id: 'identity.me.password-change',
    method: HttpMethod.post,
    path: '/v1/me/password',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.body,
    successStatus: 204,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'IDENTITY.MFA.STEP_UP_REQUIRED',
      'IDENTITY.PASSWORD.CURRENT_INVALID',
      'IDENTITY.PASSWORD.POLICY_VIOLATION',
      'IDENTITY.PASSWORD.BREACHED',
    ],
    requiresAuth: true,
    permissions: <String>[],
    platformRoles: <String>[],
    mfaMaxAgeMinutes: 10,
    encodeRequest: ChangePasswordRequest.encode,
    validateRequest: ChangePasswordRequestSchema.validate,
  );

  /// Envía el correo para restablecer la contraseña. Responde aceptado aunque el email no exista.
  ///
  /// `POST /v1/auth/password-resets`
  static const requestPasswordReset =
      RouteDescriptor<PasswordResetRequest, void>(
        id: 'identity.auth.password-reset-request',
        method: HttpMethod.post,
        path: '/v1/auth/password-resets',
        version: 1,
        pathParams: <String>[],
        requestLocation: RequestLocation.body,
        successStatus: 202,
        errors: <String>['PLATFORM.RATE_LIMIT.EXCEEDED'],
        requiresAuth: false,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: PasswordResetRequest.encode,
        validateRequest: PasswordResetRequestSchema.validate,
      );

  /// Restablece la contraseña con el token del correo y cierra las sesiones del usuario.
  ///
  /// `POST /v1/auth/password-resets/confirm`
  static const confirmPasswordReset =
      RouteDescriptor<PasswordResetConfirmRequest, void>(
        id: 'identity.auth.password-reset-confirm',
        method: HttpMethod.post,
        path: '/v1/auth/password-resets/confirm',
        version: 1,
        pathParams: <String>[],
        requestLocation: RequestLocation.body,
        successStatus: 204,
        errors: <String>[
          'IDENTITY.PASSWORD.RESET_INVALID',
          'IDENTITY.PASSWORD.POLICY_VIOLATION',
          'IDENTITY.PASSWORD.BREACHED',
          'PLATFORM.RATE_LIMIT.EXCEEDED',
        ],
        requiresAuth: false,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: PasswordResetConfirmRequest.encode,
        validateRequest: PasswordResetConfirmRequestSchema.validate,
      );

  /// Devuelve el perfil del usuario autenticado.
  ///
  /// `GET /v1/me`
  static const getProfile = RouteDescriptor<Empty, UserProfile>(
    id: 'identity.me.profile',
    method: HttpMethod.get,
    path: '/v1/me',
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
    validateResponse: UserProfileSchema.validateIncoming,
    decodeResponse: UserProfile.fromJson,
  );

  /// Cambia el nombre o el idioma del perfil y devuelve el perfil nuevo.
  ///
  /// `PATCH /v1/me`
  static const updateProfile =
      RouteDescriptor<UpdateProfileRequest, UserProfile>(
        id: 'identity.me.profile-update',
        method: HttpMethod.patch,
        path: '/v1/me',
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
        encodeRequest: UpdateProfileRequest.encode,
        validateRequest: UpdateProfileRequestSchema.validate,
        validateResponse: UserProfileSchema.validateIncoming,
        decodeResponse: UserProfile.fromJson,
      );

  /// Envía un token a la dirección nueva para confirmar el cambio de email.
  ///
  /// `POST /v1/me/email-changes`
  static const requestEmailChange = RouteDescriptor<EmailChangeRequest, void>(
    id: 'identity.me.email-change',
    method: HttpMethod.post,
    path: '/v1/me/email-changes',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.body,
    successStatus: 202,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'IDENTITY.MFA.STEP_UP_REQUIRED',
    ],
    requiresAuth: true,
    permissions: <String>[],
    platformRoles: <String>[],
    mfaMaxAgeMinutes: 10,
    encodeRequest: EmailChangeRequest.encode,
    validateRequest: EmailChangeRequestSchema.validate,
  );

  /// Aplica el cambio de email con el token enviado a la dirección nueva.
  ///
  /// `POST /v1/me/email-changes/confirm`
  static const confirmEmailChange =
      RouteDescriptor<EmailChangeConfirmRequest, void>(
        id: 'identity.me.email-change-confirm',
        method: HttpMethod.post,
        path: '/v1/me/email-changes/confirm',
        version: 1,
        pathParams: <String>[],
        requestLocation: RequestLocation.body,
        successStatus: 204,
        errors: <String>[
          'IDENTITY.SESSION.REVOKED',
          'IDENTITY.SESSION.EXPIRED',
          'IDENTITY.TOKEN.REVOKED',
          'IDENTITY.USER.SUSPENDED',
          'IDENTITY.TENANT.SUSPENDED',
          'IDENTITY.TOKEN.STALE_PERMISSIONS',
          'IDENTITY.USER.EMAIL_VERIFICATION_INVALID',
        ],
        requiresAuth: true,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: EmailChangeConfirmRequest.encode,
        validateRequest: EmailChangeConfirmRequestSchema.validate,
      );

  /// Devuelve las claves públicas vigentes en formato JWKS para verificar access tokens.
  ///
  /// `GET /v1/auth/jwks`
  static const getJwks = RouteDescriptor<Empty, Jwks>(
    id: 'identity.auth.jwks',
    method: HttpMethod.get,
    path: '/v1/auth/jwks',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.query,
    successStatus: 200,
    errors: <String>['PLATFORM.RATE_LIMIT.EXCEEDED'],
    requiresAuth: false,
    permissions: <String>[],
    platformRoles: <String>[],
    encodeRequest: Empty.encode,
    validateRequest: EmptySchema.validate,
    validateResponse: JwksSchema.validateIncoming,
    decodeResponse: Jwks.fromJson,
  );

  /// Quita un dispositivo de la cuenta y cierra sus sesiones.
  ///
  /// `DELETE /v1/me/devices/{deviceId}`
  static const removeDevice = RouteDescriptor<RemoveDeviceRequest, void>(
    id: 'identity.devices.remove',
    method: HttpMethod.delete,
    path: '/v1/me/devices/{deviceId}',
    version: 1,
    pathParams: <String>['deviceId'],
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
    encodeRequest: RemoveDeviceRequest.encode,
    validateRequest: RemoveDeviceRequestSchema.validate,
  );

  /// Quita la confianza de un dispositivo sin borrar su registro.
  ///
  /// `POST /v1/me/devices/{deviceId}/untrust`
  static const untrustDevice = RouteDescriptor<UntrustDeviceRequest, void>(
    id: 'identity.devices.untrust',
    method: HttpMethod.post,
    path: '/v1/me/devices/{deviceId}/untrust',
    version: 1,
    pathParams: <String>['deviceId'],
    requestLocation: RequestLocation.body,
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
    encodeRequest: UntrustDeviceRequest.encode,
    validateRequest: UntrustDeviceRequestSchema.validate,
  );

  /// Guarda o reemplaza el token push del dispositivo actual.
  ///
  /// `PUT /v1/me/devices/current/push-token`
  static const updatePushToken = RouteDescriptor<PushTokenRequest, void>(
    id: 'identity.devices.push-token',
    method: HttpMethod.put,
    path: '/v1/me/devices/current/push-token',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.body,
    successStatus: 204,
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
    encodeRequest: PushTokenRequest.encode,
    validateRequest: PushTokenRequestSchema.validate,
  );

  /// Devuelve las aprobaciones pendientes del dispositivo que firma la petición.
  ///
  /// `POST /v1/auth/device-approvals/pull`
  static const pullDeviceApprovals =
      RouteDescriptor<PullDeviceApprovalsRequest, DeviceApprovals>(
        id: 'identity.device-approvals.pull',
        method: HttpMethod.post,
        path: '/v1/auth/device-approvals/pull',
        version: 1,
        pathParams: <String>[],
        requestLocation: RequestLocation.body,
        successStatus: 200,
        errors: <String>[
          'IDENTITY.DEVICE.SIGNATURE_INVALID',
          'PLATFORM.RATE_LIMIT.EXCEEDED',
        ],
        requiresAuth: false,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: PullDeviceApprovalsRequest.encode,
        validateRequest: PullDeviceApprovalsRequestSchema.validate,
        validateResponse: DeviceApprovalsSchema.validateIncoming,
        decodeResponse: DeviceApprovals.fromJson,
      );

  /// Rechaza una aprobación pendiente desde el dispositivo que firma la petición.
  ///
  /// `POST /v1/auth/device-approvals/{challengeId}/deny`
  static const denyDeviceApproval =
      RouteDescriptor<DenyDeviceApprovalRequest, void>(
        id: 'identity.device-approvals.deny',
        method: HttpMethod.post,
        path: '/v1/auth/device-approvals/{challengeId}/deny',
        version: 1,
        pathParams: <String>['challengeId'],
        requestLocation: RequestLocation.body,
        successStatus: 204,
        errors: <String>[
          'IDENTITY.DEVICE.SIGNATURE_INVALID',
          'PLATFORM.RESOURCE.NOT_FOUND',
          'PLATFORM.RATE_LIMIT.EXCEEDED',
        ],
        requiresAuth: false,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: DenyDeviceApprovalRequest.encode,
        validateRequest: DenyDeviceApprovalRequestSchema.validate,
      );

  /// Crea el secreto TOTP y su URI. El factor queda activo al confirmarlo.
  ///
  /// `POST /v1/me/mfa/totp`
  static const startTotpEnrollment = RouteDescriptor<Empty, TotpEnrollment>(
    id: 'identity.mfa.totp-start',
    method: HttpMethod.post,
    path: '/v1/me/mfa/totp',
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
      'IDENTITY.MFA.STEP_UP_REQUIRED',
      'IDENTITY.MFA.FACTOR_ALREADY_ENROLLED',
    ],
    requiresAuth: true,
    permissions: <String>[],
    platformRoles: <String>[],
    mfaMaxAgeMinutes: 10,
    encodeRequest: Empty.encode,
    validateRequest: EmptySchema.validate,
    validateResponse: TotpEnrollmentSchema.validateIncoming,
    decodeResponse: TotpEnrollment.fromJson,
  );

  /// Confirma el TOTP con el primer código y devuelve los códigos de recuperación.
  ///
  /// `POST /v1/me/mfa/totp/confirm`
  static const confirmTotpEnrollment =
      RouteDescriptor<TotpConfirmRequest, RecoveryCodes>(
        id: 'identity.mfa.totp-confirm',
        method: HttpMethod.post,
        path: '/v1/me/mfa/totp/confirm',
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
          'IDENTITY.MFA.CODE_INVALID',
          'IDENTITY.MFA.CODE_EXPIRED',
          'IDENTITY.MFA.TOO_MANY_ATTEMPTS',
        ],
        requiresAuth: true,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: TotpConfirmRequest.encode,
        validateRequest: TotpConfirmRequestSchema.validate,
        validateResponse: RecoveryCodesSchema.validateIncoming,
        decodeResponse: RecoveryCodes.fromJson,
      );

  /// Quita el TOTP de la cuenta y avisa por alerta de seguridad.
  ///
  /// `DELETE /v1/me/mfa/totp`
  static const removeTotp = RouteDescriptor<Empty, void>(
    id: 'identity.mfa.totp-remove',
    method: HttpMethod.delete,
    path: '/v1/me/mfa/totp',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.query,
    successStatus: 204,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'IDENTITY.MFA.STEP_UP_REQUIRED',
      'IDENTITY.MFA.FACTOR_NOT_ENROLLED',
    ],
    requiresAuth: true,
    permissions: <String>[],
    platformRoles: <String>[],
    mfaMaxAgeMinutes: 10,
    encodeRequest: Empty.encode,
    validateRequest: EmptySchema.validate,
  );

  /// Reemplaza los códigos de recuperación y devuelve los nuevos una sola vez.
  ///
  /// `POST /v1/me/mfa/recovery-codes`
  static const regenerateRecoveryCodes = RouteDescriptor<Empty, RecoveryCodes>(
    id: 'identity.mfa.recovery-codes',
    method: HttpMethod.post,
    path: '/v1/me/mfa/recovery-codes',
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
      'IDENTITY.MFA.STEP_UP_REQUIRED',
      'IDENTITY.MFA.FACTOR_NOT_ENROLLED',
    ],
    requiresAuth: true,
    permissions: <String>[],
    platformRoles: <String>[],
    mfaMaxAgeMinutes: 10,
    encodeRequest: Empty.encode,
    validateRequest: EmptySchema.validate,
    validateResponse: RecoveryCodesSchema.validateIncoming,
    decodeResponse: RecoveryCodes.fromJson,
  );

  /// Inicia la recuperación de MFA y envía el token por email. Se confirma después de la espera indicada.
  ///
  /// `POST /v1/auth/mfa/recoveries`
  static const startMfaRecovery =
      RouteDescriptor<MfaRecoveryStartRequest, MfaRecoveryStarted>(
        id: 'identity.auth.mfa-recovery-start',
        method: HttpMethod.post,
        path: '/v1/auth/mfa/recoveries',
        version: 1,
        pathParams: <String>[],
        requestLocation: RequestLocation.body,
        successStatus: 202,
        errors: <String>[
          'IDENTITY.MFA.TOKEN_INVALID',
          'IDENTITY.MFA.RECOVERY_NOT_READY',
          'PLATFORM.RATE_LIMIT.EXCEEDED',
        ],
        requiresAuth: false,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: MfaRecoveryStartRequest.encode,
        validateRequest: MfaRecoveryStartRequestSchema.validate,
        validateResponse: MfaRecoveryStartedSchema.validateIncoming,
        decodeResponse: MfaRecoveryStarted.fromJson,
      );

  /// Confirma la recuperación de MFA, desactiva los factores anteriores y crea la sesión.
  ///
  /// `POST /v1/auth/mfa/recoveries/confirm`
  static const confirmMfaRecovery =
      RouteDescriptor<MfaRecoveryConfirmRequest, SignInResponse>(
        id: 'identity.auth.mfa-recovery-confirm',
        method: HttpMethod.post,
        path: '/v1/auth/mfa/recoveries/confirm',
        version: 1,
        pathParams: <String>[],
        requestLocation: RequestLocation.body,
        successStatus: 200,
        errors: <String>[
          'IDENTITY.MFA.TOKEN_INVALID',
          'IDENTITY.MFA.RECOVERY_NOT_READY',
          'IDENTITY.MFA.CODE_INVALID',
          'PLATFORM.RATE_LIMIT.EXCEEDED',
        ],
        requiresAuth: false,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: MfaRecoveryConfirmRequest.encode,
        validateRequest: MfaRecoveryConfirmRequestSchema.validate,
        validateResponse: SignInResponseSchema.validateIncoming,
        decodeResponse: SignInResponse.fromJson,
      );

  /// Crea el desafío de un inicio de sesión con passkey.
  ///
  /// `POST /v1/auth/passkeys/options`
  static const passkeySignInOptions = RouteDescriptor<Empty, PasskeyOptions>(
    id: 'identity.auth.passkey-options',
    method: HttpMethod.post,
    path: '/v1/auth/passkeys/options',
    version: 1,
    pathParams: <String>[],
    requestLocation: RequestLocation.body,
    successStatus: 201,
    errors: <String>['PLATFORM.RATE_LIMIT.EXCEEDED'],
    requiresAuth: false,
    permissions: <String>[],
    platformRoles: <String>[],
    encodeRequest: Empty.encode,
    validateRequest: EmptySchema.validate,
    validateResponse: PasskeyOptionsSchema.validateIncoming,
    decodeResponse: PasskeyOptions.fromJson,
  );

  /// Verifica la respuesta de la passkey y devuelve tokens o un desafío MFA.
  ///
  /// `POST /v1/auth/passkeys/verify`
  static const passkeySignInVerify =
      RouteDescriptor<PasskeySignInVerifyRequest, SignInResponse>(
        id: 'identity.auth.passkey-verify',
        method: HttpMethod.post,
        path: '/v1/auth/passkeys/verify',
        version: 1,
        pathParams: <String>[],
        requestLocation: RequestLocation.body,
        successStatus: 200,
        errors: <String>[
          'IDENTITY.PASSKEY.VERIFICATION_FAILED',
          'IDENTITY.PASSKEY.CHALLENGE_EXPIRED',
          'PLATFORM.RATE_LIMIT.EXCEEDED',
        ],
        requiresAuth: false,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: PasskeySignInVerifyRequest.encode,
        validateRequest: PasskeySignInVerifyRequestSchema.validate,
        validateResponse: SignInResponseSchema.validateIncoming,
        decodeResponse: SignInResponse.fromJson,
      );

  /// Crea el desafío de passkey para el segundo factor de un login pendiente.
  ///
  /// `POST /v1/auth/mfa/passkey/options`
  static const passkeyMfaOptions =
      RouteDescriptor<PasskeyMfaOptionsRequest, PasskeyOptions>(
        id: 'identity.auth.mfa-passkey-options',
        method: HttpMethod.post,
        path: '/v1/auth/mfa/passkey/options',
        version: 1,
        pathParams: <String>[],
        requestLocation: RequestLocation.body,
        successStatus: 201,
        errors: <String>[
          'IDENTITY.MFA.TOKEN_INVALID',
          'PLATFORM.RATE_LIMIT.EXCEEDED',
        ],
        requiresAuth: false,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: PasskeyMfaOptionsRequest.encode,
        validateRequest: PasskeyMfaOptionsRequestSchema.validate,
        validateResponse: PasskeyOptionsSchema.validateIncoming,
        decodeResponse: PasskeyOptions.fromJson,
      );

  /// Verifica la passkey como segundo factor y crea la sesión.
  ///
  /// `POST /v1/auth/mfa/passkey/verify`
  static const passkeyMfaVerify =
      RouteDescriptor<PasskeyMfaVerifyRequest, SignInResponse>(
        id: 'identity.auth.mfa-passkey-verify',
        method: HttpMethod.post,
        path: '/v1/auth/mfa/passkey/verify',
        version: 1,
        pathParams: <String>[],
        requestLocation: RequestLocation.body,
        successStatus: 200,
        errors: <String>[
          'IDENTITY.MFA.TOKEN_INVALID',
          'IDENTITY.PASSKEY.VERIFICATION_FAILED',
          'IDENTITY.PASSKEY.CHALLENGE_EXPIRED',
          'PLATFORM.RATE_LIMIT.EXCEEDED',
        ],
        requiresAuth: false,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: PasskeyMfaVerifyRequest.encode,
        validateRequest: PasskeyMfaVerifyRequestSchema.validate,
        validateResponse: SignInResponseSchema.validateIncoming,
        decodeResponse: SignInResponse.fromJson,
      );

  /// Crea el desafío de passkey para el paso adicional de una sesión abierta.
  ///
  /// `POST /v1/me/step-up/passkey/options`
  static const passkeyStepUpOptions =
      RouteDescriptor<PasskeyStepUpOptionsRequest, PasskeyOptions>(
        id: 'identity.step-up.passkey-options',
        method: HttpMethod.post,
        path: '/v1/me/step-up/passkey/options',
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
        ],
        requiresAuth: true,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: PasskeyStepUpOptionsRequest.encode,
        validateRequest: PasskeyStepUpOptionsRequestSchema.validate,
        validateResponse: PasskeyOptionsSchema.validateIncoming,
        decodeResponse: PasskeyOptions.fromJson,
      );

  /// Verifica la passkey del paso adicional y devuelve un access token con el MFA nuevo.
  ///
  /// `POST /v1/me/step-up/passkey/verify`
  static const passkeyStepUpVerify =
      RouteDescriptor<PasskeyStepUpVerifyRequest, StepUpResult>(
        id: 'identity.step-up.passkey-verify',
        method: HttpMethod.post,
        path: '/v1/me/step-up/passkey/verify',
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
          'IDENTITY.PASSKEY.VERIFICATION_FAILED',
          'IDENTITY.PASSKEY.CHALLENGE_EXPIRED',
        ],
        requiresAuth: true,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: PasskeyStepUpVerifyRequest.encode,
        validateRequest: PasskeyStepUpVerifyRequestSchema.validate,
        validateResponse: StepUpResultSchema.validateIncoming,
        decodeResponse: StepUpResult.fromJson,
      );

  /// Lista las passkeys registradas del usuario.
  ///
  /// `GET /v1/me/passkeys`
  static const listPasskeys = RouteDescriptor<PageQuery, PasskeyPage>(
    id: 'identity.passkeys.list',
    method: HttpMethod.get,
    path: '/v1/me/passkeys',
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
    validateResponse: PasskeyPageSchema.validateIncoming,
    decodeResponse: PasskeyPage.fromJson,
  );

  /// Crea el desafío para registrar una passkey nueva.
  ///
  /// `POST /v1/me/passkeys/registration-options`
  static const passkeyRegistrationOptions =
      RouteDescriptor<Empty, PasskeyOptions>(
        id: 'identity.passkeys.registration-options',
        method: HttpMethod.post,
        path: '/v1/me/passkeys/registration-options',
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
          'IDENTITY.MFA.STEP_UP_REQUIRED',
        ],
        requiresAuth: true,
        permissions: <String>[],
        platformRoles: <String>[],
        mfaMaxAgeMinutes: 10,
        encodeRequest: Empty.encode,
        validateRequest: EmptySchema.validate,
        validateResponse: PasskeyOptionsSchema.validateIncoming,
        decodeResponse: PasskeyOptions.fromJson,
      );

  /// Registra una passkey nueva con la respuesta del autenticador.
  ///
  /// `POST /v1/me/passkeys`
  static const registerPasskey =
      RouteDescriptor<RegisterPasskeyRequest, PasskeySummary>(
        id: 'identity.passkeys.register',
        method: HttpMethod.post,
        path: '/v1/me/passkeys',
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
          'IDENTITY.PASSKEY.VERIFICATION_FAILED',
          'IDENTITY.PASSKEY.CHALLENGE_EXPIRED',
        ],
        requiresAuth: true,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: RegisterPasskeyRequest.encode,
        validateRequest: RegisterPasskeyRequestSchema.validate,
        validateResponse: PasskeySummarySchema.validateIncoming,
        decodeResponse: PasskeySummary.fromJson,
      );

  /// Quita una passkey de la cuenta.
  ///
  /// `DELETE /v1/me/passkeys/{passkeyId}`
  static const removePasskey = RouteDescriptor<RemovePasskeyRequest, void>(
    id: 'identity.passkeys.remove',
    method: HttpMethod.delete,
    path: '/v1/me/passkeys/{passkeyId}',
    version: 1,
    pathParams: <String>['passkeyId'],
    requestLocation: RequestLocation.query,
    successStatus: 204,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'IDENTITY.MFA.STEP_UP_REQUIRED',
      'PLATFORM.RESOURCE.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>[],
    platformRoles: <String>[],
    mfaMaxAgeMinutes: 10,
    encodeRequest: RemovePasskeyRequest.encode,
    validateRequest: RemovePasskeyRequestSchema.validate,
  );

  /// Cambia el tenant de la sesión abierta y devuelve tokens del tenant elegido.
  ///
  /// `POST /v1/me/tenant-switch`
  static const switchTenant =
      RouteDescriptor<SwitchTenantRequest, SessionTokens>(
        id: 'identity.sessions.switch-tenant',
        method: HttpMethod.post,
        path: '/v1/me/tenant-switch',
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
          'IDENTITY.TENANT.NOT_MEMBER',
        ],
        requiresAuth: true,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: SwitchTenantRequest.encode,
        validateRequest: SwitchTenantRequestSchema.validate,
        validateResponse: SessionTokensSchema.validateIncoming,
        decodeResponse: SessionTokens.fromJson,
      );

  /// Inicia el aprovisionamiento de un tenant y deja al usuario autenticado como dueño.
  ///
  /// `POST /v1/tenants`
  static const createTenant =
      RouteDescriptor<CreateTenantRequest, TenantCreation>(
        id: 'identity.tenants.create',
        method: HttpMethod.post,
        path: '/v1/tenants',
        version: 1,
        pathParams: <String>[],
        requestLocation: RequestLocation.body,
        successStatus: 202,
        errors: <String>[
          'IDENTITY.SESSION.REVOKED',
          'IDENTITY.SESSION.EXPIRED',
          'IDENTITY.TOKEN.REVOKED',
          'IDENTITY.USER.SUSPENDED',
          'IDENTITY.TENANT.SUSPENDED',
          'IDENTITY.TOKEN.STALE_PERMISSIONS',
          'IDENTITY.TENANT.SLUG_TAKEN',
        ],
        requiresAuth: true,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: CreateTenantRequest.encode,
        validateRequest: CreateTenantRequestSchema.validate,
        validateResponse: TenantCreationSchema.validateIncoming,
        decodeResponse: TenantCreation.fromJson,
      );

  /// Devuelve el tenant de la sesión actual.
  ///
  /// `GET /v1/tenant`
  static const getTenant = RouteDescriptor<Empty, TenantSummary>(
    id: 'identity.tenant.get',
    method: HttpMethod.get,
    path: '/v1/tenant',
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
    validateResponse: TenantSummarySchema.validateIncoming,
    decodeResponse: TenantSummary.fromJson,
  );

  /// Cambia el nombre del tenant de la sesión actual.
  ///
  /// `PATCH /v1/tenant`
  static const updateTenant =
      RouteDescriptor<UpdateTenantRequest, TenantSummary>(
        id: 'identity.tenant.update',
        method: HttpMethod.patch,
        path: '/v1/tenant',
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
          'PLATFORM.AUTH.FORBIDDEN',
        ],
        requiresAuth: true,
        permissions: <String>['identity:tenant:manage'],
        platformRoles: <String>[],
        encodeRequest: UpdateTenantRequest.encode,
        validateRequest: UpdateTenantRequestSchema.validate,
        validateResponse: TenantSummarySchema.validateIncoming,
        decodeResponse: TenantSummary.fromJson,
      );

  /// Lista los tenants a los que pertenece el usuario.
  ///
  /// `GET /v1/me/tenants`
  static const listMyTenants = RouteDescriptor<PageQuery, MyTenantPage>(
    id: 'identity.me.tenants',
    method: HttpMethod.get,
    path: '/v1/me/tenants',
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
    validateResponse: MyTenantPageSchema.validateIncoming,
    decodeResponse: MyTenantPage.fromJson,
  );

  /// Lista los miembros del tenant con sus grupos.
  ///
  /// `GET /v1/tenant/members`
  static const listMembers = RouteDescriptor<PageQuery, MemberPage>(
    id: 'identity.members.list',
    method: HttpMethod.get,
    path: '/v1/tenant/members',
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
      'PLATFORM.AUTH.FORBIDDEN',
    ],
    requiresAuth: true,
    permissions: <String>['identity:members:read'],
    platformRoles: <String>[],
    encodeRequest: PageQuery.encode,
    validateRequest: PageQuerySchema.validate,
    validateResponse: MemberPageSchema.validateIncoming,
    decodeResponse: MemberPage.fromJson,
  );

  /// Quita a un miembro del tenant y revoca sus sesiones en él.
  ///
  /// `DELETE /v1/tenant/members/{userId}`
  static const removeMember = RouteDescriptor<RemoveMemberRequest, void>(
    id: 'identity.members.remove',
    method: HttpMethod.delete,
    path: '/v1/tenant/members/{userId}',
    version: 1,
    pathParams: <String>['userId'],
    requestLocation: RequestLocation.query,
    successStatus: 204,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'PLATFORM.AUTH.FORBIDDEN',
      'IDENTITY.ACCESS.LAST_OWNER',
      'PLATFORM.RESOURCE.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>['identity:members:manage'],
    platformRoles: <String>[],
    encodeRequest: RemoveMemberRequest.encode,
    validateRequest: RemoveMemberRequestSchema.validate,
  );

  /// Reemplaza los grupos de un miembro del tenant.
  ///
  /// `PUT /v1/tenant/members/{userId}/groups`
  static const setMemberGroups = RouteDescriptor<SetMemberGroupsRequest, void>(
    id: 'identity.members.set-groups',
    method: HttpMethod.put,
    path: '/v1/tenant/members/{userId}/groups',
    version: 1,
    pathParams: <String>['userId'],
    requestLocation: RequestLocation.body,
    successStatus: 204,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'PLATFORM.AUTH.FORBIDDEN',
      'PLATFORM.RESOURCE.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>['identity:members:manage'],
    platformRoles: <String>[],
    encodeRequest: SetMemberGroupsRequest.encode,
    validateRequest: SetMemberGroupsRequestSchema.validate,
  );

  /// Lista los grupos del tenant.
  ///
  /// `GET /v1/tenant/groups`
  static const listGroups = RouteDescriptor<PageQuery, GroupPage>(
    id: 'identity.groups.list',
    method: HttpMethod.get,
    path: '/v1/tenant/groups',
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
      'PLATFORM.AUTH.FORBIDDEN',
    ],
    requiresAuth: true,
    permissions: <String>['identity:members:read'],
    platformRoles: <String>[],
    encodeRequest: PageQuery.encode,
    validateRequest: PageQuerySchema.validate,
    validateResponse: GroupPageSchema.validateIncoming,
    decodeResponse: GroupPage.fromJson,
  );

  /// Crea un grupo en el tenant.
  ///
  /// `POST /v1/tenant/groups`
  static const createGroup = RouteDescriptor<CreateGroupRequest, GroupSummary>(
    id: 'identity.groups.create',
    method: HttpMethod.post,
    path: '/v1/tenant/groups',
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
      'PLATFORM.AUTH.FORBIDDEN',
      'IDENTITY.ACCESS.NAME_TAKEN',
    ],
    requiresAuth: true,
    permissions: <String>['identity:groups:manage'],
    platformRoles: <String>[],
    encodeRequest: CreateGroupRequest.encode,
    validateRequest: CreateGroupRequestSchema.validate,
    validateResponse: GroupSummarySchema.validateIncoming,
    decodeResponse: GroupSummary.fromJson,
  );

  /// Cambia el nombre de un grupo del tenant.
  ///
  /// `PATCH /v1/tenant/groups/{groupId}`
  static const updateGroup = RouteDescriptor<UpdateGroupRequest, GroupSummary>(
    id: 'identity.groups.update',
    method: HttpMethod.patch,
    path: '/v1/tenant/groups/{groupId}',
    version: 1,
    pathParams: <String>['groupId'],
    requestLocation: RequestLocation.body,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'PLATFORM.AUTH.FORBIDDEN',
      'IDENTITY.ACCESS.NAME_TAKEN',
      'PLATFORM.RESOURCE.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>['identity:groups:manage'],
    platformRoles: <String>[],
    encodeRequest: UpdateGroupRequest.encode,
    validateRequest: UpdateGroupRequestSchema.validate,
    validateResponse: GroupSummarySchema.validateIncoming,
    decodeResponse: GroupSummary.fromJson,
  );

  /// Borra un grupo del tenant y quita sus miembros del grupo.
  ///
  /// `DELETE /v1/tenant/groups/{groupId}`
  static const deleteGroup = RouteDescriptor<DeleteGroupRequest, void>(
    id: 'identity.groups.delete',
    method: HttpMethod.delete,
    path: '/v1/tenant/groups/{groupId}',
    version: 1,
    pathParams: <String>['groupId'],
    requestLocation: RequestLocation.query,
    successStatus: 204,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'PLATFORM.AUTH.FORBIDDEN',
      'PLATFORM.RESOURCE.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>['identity:groups:manage'],
    platformRoles: <String>[],
    encodeRequest: DeleteGroupRequest.encode,
    validateRequest: DeleteGroupRequestSchema.validate,
  );

  /// Reemplaza los roles de un grupo del tenant.
  ///
  /// `PUT /v1/tenant/groups/{groupId}/roles`
  static const setGroupRoles = RouteDescriptor<SetGroupRolesRequest, void>(
    id: 'identity.groups.set-roles',
    method: HttpMethod.put,
    path: '/v1/tenant/groups/{groupId}/roles',
    version: 1,
    pathParams: <String>['groupId'],
    requestLocation: RequestLocation.body,
    successStatus: 204,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'PLATFORM.AUTH.FORBIDDEN',
      'PLATFORM.RESOURCE.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>['identity:groups:manage'],
    platformRoles: <String>[],
    encodeRequest: SetGroupRolesRequest.encode,
    validateRequest: SetGroupRolesRequestSchema.validate,
  );

  /// Lista los roles del tenant con sus permisos.
  ///
  /// `GET /v1/tenant/roles`
  static const listRoles = RouteDescriptor<PageQuery, RolePage>(
    id: 'identity.roles.list',
    method: HttpMethod.get,
    path: '/v1/tenant/roles',
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
      'PLATFORM.AUTH.FORBIDDEN',
    ],
    requiresAuth: true,
    permissions: <String>['identity:members:read'],
    platformRoles: <String>[],
    encodeRequest: PageQuery.encode,
    validateRequest: PageQuerySchema.validate,
    validateResponse: RolePageSchema.validateIncoming,
    decodeResponse: RolePage.fromJson,
  );

  /// Crea un rol personalizado con sus permisos.
  ///
  /// `POST /v1/tenant/roles`
  static const createRole = RouteDescriptor<CreateRoleRequest, RoleSummary>(
    id: 'identity.roles.create',
    method: HttpMethod.post,
    path: '/v1/tenant/roles',
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
      'PLATFORM.AUTH.FORBIDDEN',
      'IDENTITY.ACCESS.NAME_TAKEN',
    ],
    requiresAuth: true,
    permissions: <String>['identity:roles:manage'],
    platformRoles: <String>[],
    encodeRequest: CreateRoleRequest.encode,
    validateRequest: CreateRoleRequestSchema.validate,
    validateResponse: RoleSummarySchema.validateIncoming,
    decodeResponse: RoleSummary.fromJson,
  );

  /// Cambia el nombre o los permisos de un rol del tenant.
  ///
  /// `PATCH /v1/tenant/roles/{roleId}`
  static const updateRole = RouteDescriptor<UpdateRoleRequest, RoleSummary>(
    id: 'identity.roles.update',
    method: HttpMethod.patch,
    path: '/v1/tenant/roles/{roleId}',
    version: 1,
    pathParams: <String>['roleId'],
    requestLocation: RequestLocation.body,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'PLATFORM.AUTH.FORBIDDEN',
      'IDENTITY.ACCESS.NAME_TAKEN',
      'IDENTITY.ACCESS.SYSTEM_ROLE_IMMUTABLE',
      'PLATFORM.RESOURCE.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>['identity:roles:manage'],
    platformRoles: <String>[],
    encodeRequest: UpdateRoleRequest.encode,
    validateRequest: UpdateRoleRequestSchema.validate,
    validateResponse: RoleSummarySchema.validateIncoming,
    decodeResponse: RoleSummary.fromJson,
  );

  /// Borra un rol personalizado del tenant. Los roles de sistema no se borran.
  ///
  /// `DELETE /v1/tenant/roles/{roleId}`
  static const deleteRole = RouteDescriptor<DeleteRoleRequest, void>(
    id: 'identity.roles.delete',
    method: HttpMethod.delete,
    path: '/v1/tenant/roles/{roleId}',
    version: 1,
    pathParams: <String>['roleId'],
    requestLocation: RequestLocation.query,
    successStatus: 204,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'PLATFORM.AUTH.FORBIDDEN',
      'IDENTITY.ACCESS.SYSTEM_ROLE_IMMUTABLE',
      'PLATFORM.RESOURCE.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>['identity:roles:manage'],
    platformRoles: <String>[],
    encodeRequest: DeleteRoleRequest.encode,
    validateRequest: DeleteRoleRequestSchema.validate,
  );

  /// Invita a un email a unirse al tenant en los grupos indicados.
  ///
  /// `POST /v1/tenant/invitations`
  static const inviteUser =
      RouteDescriptor<InviteUserRequest, InvitationSummary>(
        id: 'identity.invitations.create',
        method: HttpMethod.post,
        path: '/v1/tenant/invitations',
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
          'PLATFORM.AUTH.FORBIDDEN',
        ],
        requiresAuth: true,
        permissions: <String>['identity:invitations:manage'],
        platformRoles: <String>[],
        encodeRequest: InviteUserRequest.encode,
        validateRequest: InviteUserRequestSchema.validate,
        validateResponse: InvitationSummarySchema.validateIncoming,
        decodeResponse: InvitationSummary.fromJson,
      );

  /// Lista las invitaciones del tenant con su estado.
  ///
  /// `GET /v1/tenant/invitations`
  static const listInvitations = RouteDescriptor<PageQuery, InvitationPage>(
    id: 'identity.invitations.list',
    method: HttpMethod.get,
    path: '/v1/tenant/invitations',
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
      'PLATFORM.AUTH.FORBIDDEN',
    ],
    requiresAuth: true,
    permissions: <String>['identity:invitations:manage'],
    platformRoles: <String>[],
    encodeRequest: PageQuery.encode,
    validateRequest: PageQuerySchema.validate,
    validateResponse: InvitationPageSchema.validateIncoming,
    decodeResponse: InvitationPage.fromJson,
  );

  /// Revoca una invitación pendiente.
  ///
  /// `DELETE /v1/tenant/invitations/{invitationId}`
  static const revokeInvitation =
      RouteDescriptor<RevokeInvitationRequest, void>(
        id: 'identity.invitations.revoke',
        method: HttpMethod.delete,
        path: '/v1/tenant/invitations/{invitationId}',
        version: 1,
        pathParams: <String>['invitationId'],
        requestLocation: RequestLocation.query,
        successStatus: 204,
        errors: <String>[
          'IDENTITY.SESSION.REVOKED',
          'IDENTITY.SESSION.EXPIRED',
          'IDENTITY.TOKEN.REVOKED',
          'IDENTITY.USER.SUSPENDED',
          'IDENTITY.TENANT.SUSPENDED',
          'IDENTITY.TOKEN.STALE_PERMISSIONS',
          'PLATFORM.AUTH.FORBIDDEN',
          'IDENTITY.INVITATION.INVALID',
          'PLATFORM.RESOURCE.NOT_FOUND',
        ],
        requiresAuth: true,
        permissions: <String>['identity:invitations:manage'],
        platformRoles: <String>[],
        encodeRequest: RevokeInvitationRequest.encode,
        validateRequest: RevokeInvitationRequestSchema.validate,
      );

  /// Acepta una invitación. El email de la sesión debe ser el invitado y estar verificado.
  ///
  /// `POST /v1/invitations/accept`
  static const acceptInvitation =
      RouteDescriptor<AcceptInvitationRequest, void>(
        id: 'identity.invitations.accept',
        method: HttpMethod.post,
        path: '/v1/invitations/accept',
        version: 1,
        pathParams: <String>[],
        requestLocation: RequestLocation.body,
        successStatus: 204,
        errors: <String>[
          'IDENTITY.SESSION.REVOKED',
          'IDENTITY.SESSION.EXPIRED',
          'IDENTITY.TOKEN.REVOKED',
          'IDENTITY.USER.SUSPENDED',
          'IDENTITY.TENANT.SUSPENDED',
          'IDENTITY.TOKEN.STALE_PERMISSIONS',
          'IDENTITY.INVITATION.INVALID',
          'IDENTITY.INVITATION.EMAIL_MISMATCH',
          'IDENTITY.AUTH.EMAIL_NOT_VERIFIED',
        ],
        requiresAuth: true,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: AcceptInvitationRequest.encode,
        validateRequest: AcceptInvitationRequestSchema.validate,
      );

  /// Lista las service accounts del tenant.
  ///
  /// `GET /v1/tenant/service-accounts`
  static const listServiceAccounts =
      RouteDescriptor<PageQuery, ServiceAccountPage>(
        id: 'identity.service-accounts.list',
        method: HttpMethod.get,
        path: '/v1/tenant/service-accounts',
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
          'PLATFORM.AUTH.FORBIDDEN',
        ],
        requiresAuth: true,
        permissions: <String>['identity:service-accounts:manage'],
        platformRoles: <String>[],
        encodeRequest: PageQuery.encode,
        validateRequest: PageQuerySchema.validate,
        validateResponse: ServiceAccountPageSchema.validateIncoming,
        decodeResponse: ServiceAccountPage.fromJson,
      );

  /// Crea una service account con los permisos indicados.
  ///
  /// `POST /v1/tenant/service-accounts`
  static const createServiceAccount =
      RouteDescriptor<CreateServiceAccountRequest, ServiceAccountSummary>(
        id: 'identity.service-accounts.create',
        method: HttpMethod.post,
        path: '/v1/tenant/service-accounts',
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
          'PLATFORM.AUTH.FORBIDDEN',
          'IDENTITY.API_KEY.PERMISSION_NOT_GRANTABLE',
        ],
        requiresAuth: true,
        permissions: <String>['identity:service-accounts:manage'],
        platformRoles: <String>[],
        encodeRequest: CreateServiceAccountRequest.encode,
        validateRequest: CreateServiceAccountRequestSchema.validate,
        validateResponse: ServiceAccountSummarySchema.validateIncoming,
        decodeResponse: ServiceAccountSummary.fromJson,
      );

  /// Cambia el nombre o los permisos de una service account.
  ///
  /// `PATCH /v1/tenant/service-accounts/{serviceAccountId}`
  static const updateServiceAccount =
      RouteDescriptor<UpdateServiceAccountRequest, ServiceAccountSummary>(
        id: 'identity.service-accounts.update',
        method: HttpMethod.patch,
        path: '/v1/tenant/service-accounts/{serviceAccountId}',
        version: 1,
        pathParams: <String>['serviceAccountId'],
        requestLocation: RequestLocation.body,
        successStatus: 200,
        errors: <String>[
          'IDENTITY.SESSION.REVOKED',
          'IDENTITY.SESSION.EXPIRED',
          'IDENTITY.TOKEN.REVOKED',
          'IDENTITY.USER.SUSPENDED',
          'IDENTITY.TENANT.SUSPENDED',
          'IDENTITY.TOKEN.STALE_PERMISSIONS',
          'PLATFORM.AUTH.FORBIDDEN',
          'IDENTITY.API_KEY.PERMISSION_NOT_GRANTABLE',
          'PLATFORM.RESOURCE.NOT_FOUND',
        ],
        requiresAuth: true,
        permissions: <String>['identity:service-accounts:manage'],
        platformRoles: <String>[],
        encodeRequest: UpdateServiceAccountRequest.encode,
        validateRequest: UpdateServiceAccountRequestSchema.validate,
        validateResponse: ServiceAccountSummarySchema.validateIncoming,
        decodeResponse: ServiceAccountSummary.fromJson,
      );

  /// Borra una service account y revoca sus API keys.
  ///
  /// `DELETE /v1/tenant/service-accounts/{serviceAccountId}`
  static const deleteServiceAccount =
      RouteDescriptor<DeleteServiceAccountRequest, void>(
        id: 'identity.service-accounts.delete',
        method: HttpMethod.delete,
        path: '/v1/tenant/service-accounts/{serviceAccountId}',
        version: 1,
        pathParams: <String>['serviceAccountId'],
        requestLocation: RequestLocation.query,
        successStatus: 204,
        errors: <String>[
          'IDENTITY.SESSION.REVOKED',
          'IDENTITY.SESSION.EXPIRED',
          'IDENTITY.TOKEN.REVOKED',
          'IDENTITY.USER.SUSPENDED',
          'IDENTITY.TENANT.SUSPENDED',
          'IDENTITY.TOKEN.STALE_PERMISSIONS',
          'PLATFORM.AUTH.FORBIDDEN',
          'PLATFORM.RESOURCE.NOT_FOUND',
        ],
        requiresAuth: true,
        permissions: <String>['identity:service-accounts:manage'],
        platformRoles: <String>[],
        encodeRequest: DeleteServiceAccountRequest.encode,
        validateRequest: DeleteServiceAccountRequestSchema.validate,
      );

  /// Lista las API keys de una service account sin sus secretos.
  ///
  /// `GET /v1/tenant/service-accounts/{serviceAccountId}/api-keys`
  static const listApiKeys = RouteDescriptor<ListApiKeysRequest, ApiKeyPage>(
    id: 'identity.api-keys.list',
    method: HttpMethod.get,
    path: '/v1/tenant/service-accounts/{serviceAccountId}/api-keys',
    version: 1,
    pathParams: <String>['serviceAccountId'],
    requestLocation: RequestLocation.query,
    successStatus: 200,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'PLATFORM.AUTH.FORBIDDEN',
      'PLATFORM.RESOURCE.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>['identity:api-keys:manage'],
    platformRoles: <String>[],
    encodeRequest: ListApiKeysRequest.encode,
    validateRequest: ListApiKeysRequestSchema.validate,
    validateResponse: ApiKeyPageSchema.validateIncoming,
    decodeResponse: ApiKeyPage.fromJson,
  );

  /// Crea una API key. El secreto aparece solo en esta respuesta.
  ///
  /// `POST /v1/tenant/service-accounts/{serviceAccountId}/api-keys`
  static const createApiKey =
      RouteDescriptor<CreateApiKeyRequest, CreatedApiKey>(
        id: 'identity.api-keys.create',
        method: HttpMethod.post,
        path: '/v1/tenant/service-accounts/{serviceAccountId}/api-keys',
        version: 1,
        pathParams: <String>['serviceAccountId'],
        requestLocation: RequestLocation.body,
        successStatus: 201,
        errors: <String>[
          'IDENTITY.SESSION.REVOKED',
          'IDENTITY.SESSION.EXPIRED',
          'IDENTITY.TOKEN.REVOKED',
          'IDENTITY.USER.SUSPENDED',
          'IDENTITY.TENANT.SUSPENDED',
          'IDENTITY.TOKEN.STALE_PERMISSIONS',
          'PLATFORM.AUTH.FORBIDDEN',
          'IDENTITY.MFA.STEP_UP_REQUIRED',
          'IDENTITY.API_KEY.PERMISSION_NOT_GRANTABLE',
          'IDENTITY.SERVICE_ACCOUNT.DISABLED',
          'PLATFORM.RESOURCE.NOT_FOUND',
        ],
        requiresAuth: true,
        permissions: <String>['identity:api-keys:manage'],
        platformRoles: <String>[],
        mfaMaxAgeMinutes: 10,
        encodeRequest: CreateApiKeyRequest.encode,
        validateRequest: CreateApiKeyRequestSchema.validate,
        validateResponse: CreatedApiKeySchema.validateIncoming,
        decodeResponse: CreatedApiKey.fromJson,
      );

  /// Rota una API key: la nueva aparece una vez y la anterior sigue válida hasta su vencimiento.
  ///
  /// `POST /v1/tenant/api-keys/{apiKeyId}/rotate`
  static const rotateApiKey =
      RouteDescriptor<RotateApiKeyRequest, CreatedApiKey>(
        id: 'identity.api-keys.rotate',
        method: HttpMethod.post,
        path: '/v1/tenant/api-keys/{apiKeyId}/rotate',
        version: 1,
        pathParams: <String>['apiKeyId'],
        requestLocation: RequestLocation.body,
        successStatus: 201,
        errors: <String>[
          'IDENTITY.SESSION.REVOKED',
          'IDENTITY.SESSION.EXPIRED',
          'IDENTITY.TOKEN.REVOKED',
          'IDENTITY.USER.SUSPENDED',
          'IDENTITY.TENANT.SUSPENDED',
          'IDENTITY.TOKEN.STALE_PERMISSIONS',
          'PLATFORM.AUTH.FORBIDDEN',
          'IDENTITY.MFA.STEP_UP_REQUIRED',
          'IDENTITY.SERVICE_ACCOUNT.DISABLED',
          'PLATFORM.RESOURCE.NOT_FOUND',
        ],
        requiresAuth: true,
        permissions: <String>['identity:api-keys:manage'],
        platformRoles: <String>[],
        mfaMaxAgeMinutes: 10,
        encodeRequest: RotateApiKeyRequest.encode,
        validateRequest: RotateApiKeyRequestSchema.validate,
        validateResponse: CreatedApiKeySchema.validateIncoming,
        decodeResponse: CreatedApiKey.fromJson,
      );

  /// Revoca una API key de inmediato.
  ///
  /// `DELETE /v1/tenant/api-keys/{apiKeyId}`
  static const revokeApiKey = RouteDescriptor<RevokeApiKeyRequest, void>(
    id: 'identity.api-keys.revoke',
    method: HttpMethod.delete,
    path: '/v1/tenant/api-keys/{apiKeyId}',
    version: 1,
    pathParams: <String>['apiKeyId'],
    requestLocation: RequestLocation.query,
    successStatus: 204,
    errors: <String>[
      'IDENTITY.SESSION.REVOKED',
      'IDENTITY.SESSION.EXPIRED',
      'IDENTITY.TOKEN.REVOKED',
      'IDENTITY.USER.SUSPENDED',
      'IDENTITY.TENANT.SUSPENDED',
      'IDENTITY.TOKEN.STALE_PERMISSIONS',
      'PLATFORM.AUTH.FORBIDDEN',
      'PLATFORM.RESOURCE.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>['identity:api-keys:manage'],
    platformRoles: <String>[],
    encodeRequest: RevokeApiKeyRequest.encode,
    validateRequest: RevokeApiKeyRequestSchema.validate,
  );

  /// Inicia el borrado de la cuenta del usuario autenticado. La saga se consulta con su id.
  ///
  /// `POST /v1/me/deletion`
  static const startAccountDeletion =
      RouteDescriptor<Empty, AccountDeletionStarted>(
        id: 'identity.me.deletion',
        method: HttpMethod.post,
        path: '/v1/me/deletion',
        version: 1,
        pathParams: <String>[],
        requestLocation: RequestLocation.body,
        successStatus: 202,
        errors: <String>[
          'IDENTITY.SESSION.REVOKED',
          'IDENTITY.SESSION.EXPIRED',
          'IDENTITY.TOKEN.REVOKED',
          'IDENTITY.USER.SUSPENDED',
          'IDENTITY.TENANT.SUSPENDED',
          'IDENTITY.TOKEN.STALE_PERMISSIONS',
          'IDENTITY.MFA.STEP_UP_REQUIRED',
        ],
        requiresAuth: true,
        permissions: <String>[],
        platformRoles: <String>[],
        mfaMaxAgeMinutes: 10,
        encodeRequest: Empty.encode,
        validateRequest: EmptySchema.validate,
        validateResponse: AccountDeletionStartedSchema.validateIncoming,
        decodeResponse: AccountDeletionStarted.fromJson,
      );

  /// Devuelve el estado de una saga propia o de su tenant.
  ///
  /// `GET /v1/sagas/{sagaId}`
  static const getSaga = RouteDescriptor<GetSagaRequest, SagaSummary>(
    id: 'identity.sagas.get',
    method: HttpMethod.get,
    path: '/v1/sagas/{sagaId}',
    version: 1,
    pathParams: <String>['sagaId'],
    requestLocation: RequestLocation.query,
    successStatus: 200,
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
    encodeRequest: GetSagaRequest.encode,
    validateRequest: GetSagaRequestSchema.validate,
    validateResponse: SagaSummarySchema.validateIncoming,
    decodeResponse: SagaSummary.fromJson,
  );
}
