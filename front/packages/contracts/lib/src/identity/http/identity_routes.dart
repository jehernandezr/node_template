// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen
// ignore_for_file: public_member_api_docs

import '../../core/core.dart';
import '../../identity/schemas/identity_schemas.dart';
import '../../identity/types/identity_types.dart';
import '../../platform/enums/platform_enums.dart';
import '../../platform/schemas/platform_schemas.dart';
import '../../platform/types/platform_types.dart';

/// Public HTTP routes of the `identity` contract.
abstract final class IdentityRoutes {
  /// Signs in with email and password. Responds with tokens or an MFA challenge.
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

  /// Creates an MFA challenge for the pending login and sends the code through the chosen method.
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

  /// Verifies an MFA challenge, creates the session and registers the new device.
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

  /// Rotates the session token (body on mobile, httpOnly cookie on web) and issues a new access token.
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

  /// Closes the session of the session token, revokes its tokens and clears the cookie on web.
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

  /// Opens the step-up of the current session and returns the methods it offers.
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

  /// Creates the step-up challenge and sends the code through the chosen method.
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

  /// Verifies the step-up, updates the last MFA of the session and issues a new access token.
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

  /// Returns user, tenant, permissions, roles, plan, flags and last MFA of the current session.
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

  /// Lists the active sessions of the user, current one first.
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

  /// Closes a session of the user and revokes its tokens.
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

  /// Closes all sessions of the user except the current one.
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

  /// Lists the user devices with active trust.
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

  /// Registers a user and sends the verification email. Responds accepted without revealing whether the email already exists.
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
      'BILLING.QUOTA.EXCEEDED',
      'PLATFORM.RATE_LIMIT.EXCEEDED',
    ],
    requiresAuth: false,
    permissions: <String>[],
    platformRoles: <String>[],
    encodeRequest: SignUpRequest.encode,
    validateRequest: SignUpRequestSchema.validate,
  );

  /// Sends a new verification email. Responds accepted even if the email does not exist.
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

  /// Marks the user email as verified with the received token.
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

  /// Changes the password and closes the other sessions of the user.
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

  /// Sends the password reset email. Responds accepted even if the email does not exist.
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

  /// Resets the password with the emailed token and closes the user sessions.
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

  /// Returns the profile of the authenticated user.
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

  /// Changes the profile name or language and returns the new profile.
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

  /// Sends a token to the new address to confirm the email change.
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

  /// Applies the email change with the token sent to the new address.
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

  /// Returns the active public keys in JWKS format to verify access tokens.
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

  /// Removes a device from the account and closes its sessions.
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

  /// Removes the trust of a device without deleting its record.
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

  /// Saves or replaces the push token of the current device.
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

  /// Returns the pending approvals of the device that signs the request.
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

  /// Rejects a pending approval from the device that signs the request.
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

  /// Creates the TOTP secret and its URI. The factor becomes active once confirmed.
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

  /// Confirms the TOTP with the first code and returns the recovery codes.
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

  /// Removes the TOTP from the account and sends a security alert.
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

  /// Replaces the recovery codes and returns the new ones only once.
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

  /// Starts MFA recovery and sends the token by email. It is confirmed after the indicated wait.
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

  /// Confirms MFA recovery, disables the previous factors and creates the session.
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

  /// Creates the challenge for a passkey sign-in.
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

  /// Verifies the passkey response and returns tokens or an MFA challenge.
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

  /// Creates the passkey challenge for the second factor of a pending login.
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

  /// Verifies the passkey as second factor and creates the session.
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

  /// Creates the passkey challenge for the step-up of an open session.
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

  /// Verifies the step-up passkey and returns an access token with the new MFA.
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

  /// Lists the registered passkeys of the user.
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

  /// Creates the challenge to register a new passkey.
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

  /// Registers a new passkey with the authenticator response.
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

  /// Removes a passkey from the account.
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

  /// Switches the tenant of the open session and returns tokens for the chosen tenant.
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

  /// Starts provisioning a tenant and makes the authenticated user its owner.
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

  /// Returns the tenant of the current session.
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

  /// Changes the name of the current session tenant.
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

  /// Lists the tenants the user belongs to.
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

  /// Lists the members of the tenant with their groups, a page at a time.
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

  /// Removes a member from the tenant and revokes their sessions in it.
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
      'IDENTITY.MFA.STEP_UP_REQUIRED',
      'IDENTITY.ACCESS.LAST_OWNER',
      'PLATFORM.RESOURCE.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>['identity:members:manage'],
    platformRoles: <String>[],
    mfaMaxAgeMinutes: 10,
    encodeRequest: RemoveMemberRequest.encode,
    validateRequest: RemoveMemberRequestSchema.validate,
  );

  /// Replaces the groups of a member of the tenant.
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
      'IDENTITY.MFA.STEP_UP_REQUIRED',
      'PLATFORM.RESOURCE.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>['identity:members:manage'],
    platformRoles: <String>[],
    mfaMaxAgeMinutes: 10,
    encodeRequest: SetMemberGroupsRequest.encode,
    validateRequest: SetMemberGroupsRequestSchema.validate,
  );

  /// Lists the groups of the tenant.
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

  /// Creates a group in the tenant.
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

  /// Renames a group of the tenant.
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

  /// Deletes a group of the tenant and takes its members out of it.
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

  /// Replaces the roles of a group of the tenant.
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
      'IDENTITY.MFA.STEP_UP_REQUIRED',
      'PLATFORM.RESOURCE.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>['identity:groups:manage'],
    platformRoles: <String>[],
    mfaMaxAgeMinutes: 10,
    encodeRequest: SetGroupRolesRequest.encode,
    validateRequest: SetGroupRolesRequestSchema.validate,
  );

  /// Lists the roles of the tenant with their permissions.
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

  /// Creates a custom role with its permissions.
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
      'IDENTITY.MFA.STEP_UP_REQUIRED',
      'IDENTITY.ACCESS.NAME_TAKEN',
    ],
    requiresAuth: true,
    permissions: <String>['identity:roles:manage'],
    platformRoles: <String>[],
    mfaMaxAgeMinutes: 10,
    encodeRequest: CreateRoleRequest.encode,
    validateRequest: CreateRoleRequestSchema.validate,
    validateResponse: RoleSummarySchema.validateIncoming,
    decodeResponse: RoleSummary.fromJson,
  );

  /// Renames a role of the tenant or changes its permissions.
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
      'IDENTITY.MFA.STEP_UP_REQUIRED',
      'IDENTITY.ACCESS.NAME_TAKEN',
      'IDENTITY.ACCESS.SYSTEM_ROLE_IMMUTABLE',
      'PLATFORM.RESOURCE.NOT_FOUND',
    ],
    requiresAuth: true,
    permissions: <String>['identity:roles:manage'],
    platformRoles: <String>[],
    mfaMaxAgeMinutes: 10,
    encodeRequest: UpdateRoleRequest.encode,
    validateRequest: UpdateRoleRequestSchema.validate,
    validateResponse: RoleSummarySchema.validateIncoming,
    decodeResponse: RoleSummary.fromJson,
  );

  /// Deletes a custom role of the tenant. System roles are not deleted.
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

  /// Invites an email to join the tenant in the given groups.
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
          'IDENTITY.MFA.STEP_UP_REQUIRED',
        ],
        requiresAuth: true,
        permissions: <String>['identity:invitations:manage'],
        platformRoles: <String>[],
        mfaMaxAgeMinutes: 10,
        encodeRequest: InviteUserRequest.encode,
        validateRequest: InviteUserRequestSchema.validate,
        validateResponse: InvitationSummarySchema.validateIncoming,
        decodeResponse: InvitationSummary.fromJson,
      );

  /// Lists the invitations of the tenant with their status.
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

  /// Revokes a pending invitation.
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

  /// Accepts an invitation. The email of the session must be the invited one and verified, its inviter must still be able to grant its groups, and the plan of the tenant must have a seat.
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
          'BILLING.QUOTA.EXCEEDED',
        ],
        requiresAuth: true,
        permissions: <String>[],
        platformRoles: <String>[],
        encodeRequest: AcceptInvitationRequest.encode,
        validateRequest: AcceptInvitationRequestSchema.validate,
      );

  /// Lists the service accounts of the tenant.
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

  /// Creates a service account with the given permissions.
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
          'IDENTITY.MFA.STEP_UP_REQUIRED',
          'IDENTITY.API_KEY.PERMISSION_NOT_GRANTABLE',
        ],
        requiresAuth: true,
        permissions: <String>['identity:service-accounts:manage'],
        platformRoles: <String>[],
        mfaMaxAgeMinutes: 10,
        encodeRequest: CreateServiceAccountRequest.encode,
        validateRequest: CreateServiceAccountRequestSchema.validate,
        validateResponse: ServiceAccountSummarySchema.validateIncoming,
        decodeResponse: ServiceAccountSummary.fromJson,
      );

  /// Changes the name or the permissions of a service account.
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
          'IDENTITY.MFA.STEP_UP_REQUIRED',
          'IDENTITY.API_KEY.PERMISSION_NOT_GRANTABLE',
          'PLATFORM.RESOURCE.NOT_FOUND',
        ],
        requiresAuth: true,
        permissions: <String>['identity:service-accounts:manage'],
        platformRoles: <String>[],
        mfaMaxAgeMinutes: 10,
        encodeRequest: UpdateServiceAccountRequest.encode,
        validateRequest: UpdateServiceAccountRequestSchema.validate,
        validateResponse: ServiceAccountSummarySchema.validateIncoming,
        decodeResponse: ServiceAccountSummary.fromJson,
      );

  /// Deletes a service account and revokes its API keys.
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

  /// Lists the API keys of a service account without their secrets.
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

  /// Creates an API key whose account permissions the caller holds. The secret appears only in this response.
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

  /// Rotates an active API key whose account permissions the caller holds: the new one appears once and the previous one stays valid for the grace period.
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

  /// Revokes an API key at once.
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

  /// Starts the deletion of the account of the authenticated user, unless they are the last owner of a tenant with other members. The saga is read with its id.
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
          'IDENTITY.ACCESS.LAST_OWNER',
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

  /// Returns the status of an own saga or one of the tenant.
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
