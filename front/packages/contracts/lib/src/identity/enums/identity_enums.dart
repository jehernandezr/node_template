// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen
// ignore_for_file: public_member_api_docs

/// Permission within a tenant.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum Permission {
  tasksRead('tasks:read'),
  tasksWrite('tasks:write'),
  billingRead('billing:read'),
  billingWrite('billing:write'),
  reportsRead('reports:read'),
  reportsWrite('reports:write'),
  backofficeAccess('backoffice:access'),
  identityMembersRead('identity:members:read'),
  identityMembersManage('identity:members:manage'),
  identityGroupsManage('identity:groups:manage'),
  identityRolesManage('identity:roles:manage'),
  identityInvitationsManage('identity:invitations:manage'),
  identityServiceAccountsManage('identity:service-accounts:manage'),
  identityApiKeysManage('identity:api-keys:manage'),
  identityTenantManage('identity:tenant:manage');

  const Permission(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static Permission? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Platform role.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum PlatformRole {
  superAdmin('super_admin'),
  support('support'),
  finance('finance'),
  readOnly('read_only');

  const PlatformRole(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static PlatformRole? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Plan feature.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum PlanFeature {
  aiAssistant('ai_assistant'),
  webhooks('webhooks'),
  billing('billing'),
  advancedReports('advanced_reports');

  const PlanFeature(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static PlanFeature? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Feature flag.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum FeatureFlag {
  newReports('new_reports');

  const FeatureFlag(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static FeatureFlag? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Second factor method.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum MfaFactor {
  deviceOtp('device_otp'),
  emailOtp('email_otp'),
  totp('totp'),
  recoveryCode('recovery_code'),
  passkey('passkey');

  const MfaFactor(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static MfaFactor? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Result of a sign-in.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum SignInStatus {
  authenticated('authenticated'),
  mfaRequired('mfa_required');

  const SignInStatus(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static SignInStatus? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Client platform.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum ClientPlatform {
  ios('ios'),
  android('android'),
  web('web'),
  macos('macos'),
  windows('windows'),
  linux('linux');

  const ClientPlatform(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static ClientPlatform? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Reason for a revocation.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum RevocationReason {
  logout('logout'),
  userAction('user_action'),
  passwordChanged('password_changed'),
  adminAction('admin_action'),
  compromised('compromised');

  const RevocationReason(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static RevocationReason? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Scope of a token revocation.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum RevocationScope {
  session('session'),
  user('user'),
  tenant('tenant');

  const RevocationScope(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static RevocationScope? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Method with which the session was authenticated (amr).
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum AuthMethodReference {
  password('pwd'),
  passkey('passkey'),
  device('device'),
  emailOtp('email_otp'),
  totp('totp'),
  recoveryCode('recovery_code');

  const AuthMethodReference(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static AuthMethodReference? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Audience of an access token.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum TokenAudience {
  api('api'),
  backoffice('backoffice');

  const TokenAudience(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static TokenAudience? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// System role of a tenant.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum TenantRole {
  owner('owner'),
  admin('admin'),
  member('member'),
  billing('billing');

  const TenantRole(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static TenantRole? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Tenant type.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum TenantKind {
  organization('organization'),
  sharedCustomers('shared_customers'),
  platform('platform');

  const TenantKind(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static TenantKind? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Lifecycle of a tenant.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum TenantLifecycle {
  provisioning('provisioning'),
  active('active'),
  suspended('suspended'),
  deleting('deleting');

  const TenantLifecycle(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static TenantLifecycle? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Status of an invitation.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum InvitationStatus {
  pending('pending'),
  accepted('accepted'),
  revoked('revoked'),
  expired('expired');

  const InvitationStatus(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static InvitationStatus? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// What changed in the membership of a user.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum MembershipChangeKind {
  added('added'),
  removed('removed'),
  groupsChanged('groups_changed');

  const MembershipChangeKind(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static MembershipChangeKind? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Status of a user account.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum UserStatus {
  pendingVerification('pending_verification'),
  active('active'),
  suspended('suspended'),
  deleted('deleted');

  const UserStatus(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static UserStatus? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Security alert on an account.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum SecurityAlertType {
  newDeviceSignIn('new_device_sign_in'),
  verifierRegistered('verifier_registered'),
  passwordChanged('password_changed'),
  passwordRecovered('password_recovered'),
  mfaRecoveryStarted('mfa_recovery_started'),
  mfaRecoveryCompleted('mfa_recovery_completed'),
  emailChanged('email_changed'),
  mfaFactorRemoved('mfa_factor_removed'),
  recoveryCodeUsed('recovery_code_used'),
  apiKeyCreated('api_key_created'),
  apiKeyRevoked('api_key_revoked'),
  accountLocked('account_locked'),
  protectedModeEnabled('protected_mode_enabled'),
  deviceApprovalDenied('device_approval_denied');

  const SecurityAlertType(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static SecurityAlertType? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Environment of an API key.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum ApiKeyEnvironment {
  live('live'),
  test('test');

  const ApiKeyEnvironment(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static ApiKeyEnvironment? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Status of an API key.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum ApiKeyStatus {
  active('active'),
  rotated('rotated'),
  revoked('revoked');

  const ApiKeyStatus(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static ApiKeyStatus? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Status of a service account.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum ServiceAccountStatus {
  active('active'),
  disabled('disabled');

  const ServiceAccountStatus(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static ServiceAccountStatus? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Public error codes of the `identity` contract.
///
/// Only includes codes with `public` audience: internal ones never
/// reach the client. [messageKey] is the message key in the ARB.
enum IdentityErrorCode {
  /// The email or password is not valid, or the origin is blocked after failed attempts.
  authInvalidCredentials(
    'IDENTITY.AUTH.INVALID_CREDENTIALS',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_identity_auth_invalid_credentials',
  ),

  /// The MFA challenge does not exist or expired. Sign in again.
  mfaTokenInvalid(
    'IDENTITY.MFA.TOKEN_INVALID',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_identity_mfa_token_invalid',
  ),

  /// The verification code is not correct.
  mfaCodeInvalid(
    'IDENTITY.MFA.CODE_INVALID',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_mfa_code_invalid',
  ),

  /// The verification code expired. Request a new one.
  mfaCodeExpired(
    'IDENTITY.MFA.CODE_EXPIRED',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_mfa_code_expired',
  ),

  /// The challenge attempts ran out. Request a new one.
  mfaTooManyAttempts(
    'IDENTITY.MFA.TOO_MANY_ATTEMPTS',
    httpStatus: 429,
    retryable: false,
    messageKey: 'error_identity_mfa_too_many_attempts',
  ),

  /// The operation requires verifying the second factor again.
  mfaStepUpRequired(
    'IDENTITY.MFA.STEP_UP_REQUIRED',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_identity_mfa_step_up_required',
  ),

  /// The requested method is not among those offered by the MFA challenge. Choose another.
  mfaMethodUnavailable(
    'IDENTITY.MFA.METHOD_UNAVAILABLE',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_mfa_method_unavailable',
  ),

  /// The session was closed. Sign in again.
  sessionRevoked(
    'IDENTITY.SESSION.REVOKED',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_identity_session_revoked',
  ),

  /// The session expired due to inactivity or the absolute limit. Sign in again.
  sessionExpired(
    'IDENTITY.SESSION.EXPIRED',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_identity_session_expired',
  ),

  /// An already rotated session token was presented. The whole session was revoked. Sign in again.
  sessionReused(
    'IDENTITY.SESSION.REUSED',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_identity_session_reused',
  ),

  /// Permissions changed since the token was issued. The client refreshes and retries.
  tokenStalePermissions(
    'IDENTITY.TOKEN.STALE_PERMISSIONS',
    httpStatus: 401,
    retryable: true,
    messageKey: 'error_identity_token_stale_permissions',
  ),

  /// The access token was revoked by the user or tenant epoch. Sign in again.
  tokenRevoked(
    'IDENTITY.TOKEN.REVOKED',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_identity_token_revoked',
  ),

  /// The user is suspended. Their sessions stay closed until reactivated.
  userSuspended(
    'IDENTITY.USER.SUSPENDED',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_identity_user_suspended',
  ),

  /// The tenant is suspended. Sessions in it stay closed until reactivated.
  tenantSuspended(
    'IDENTITY.TENANT.SUSPENDED',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_identity_tenant_suspended',
  ),

  /// The email is not verified yet. Confirm the link sent to your email.
  authEmailNotVerified(
    'IDENTITY.AUTH.EMAIL_NOT_VERIFIED',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_identity_auth_email_not_verified',
  ),

  /// The email verification link is not valid or expired. Request a new one.
  userEmailVerificationInvalid(
    'IDENTITY.USER.EMAIL_VERIFICATION_INVALID',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_user_email_verification_invalid',
  ),

  /// The password does not meet the policy: 12 to 128 characters and different from the email.
  passwordPolicyViolation(
    'IDENTITY.PASSWORD.POLICY_VIOLATION',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_password_policy_violation',
  ),

  /// The password appears in known breaches. Choose another.
  passwordBreached(
    'IDENTITY.PASSWORD.BREACHED',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_password_breached',
  ),

  /// The current password is not correct.
  passwordCurrentInvalid(
    'IDENTITY.PASSWORD.CURRENT_INVALID',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_password_current_invalid',
  ),

  /// The password reset link is not valid or expired. Request a new one.
  passwordResetInvalid(
    'IDENTITY.PASSWORD.RESET_INVALID',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_password_reset_invalid',
  ),

  /// The device signature is not valid.
  deviceSignatureInvalid(
    'IDENTITY.DEVICE.SIGNATURE_INVALID',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_identity_device_signature_invalid',
  ),

  /// The device public key is not valid.
  deviceKeyInvalid(
    'IDENTITY.DEVICE.KEY_INVALID',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_device_key_invalid',
  ),

  /// Second factor recovery is not available yet. Try again when the waiting period ends.
  mfaRecoveryNotReady(
    'IDENTITY.MFA.RECOVERY_NOT_READY',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_identity_mfa_recovery_not_ready',
  ),

  /// That second factor is already active.
  mfaFactorAlreadyEnrolled(
    'IDENTITY.MFA.FACTOR_ALREADY_ENROLLED',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_identity_mfa_factor_already_enrolled',
  ),

  /// That second factor is not active.
  mfaFactorNotEnrolled(
    'IDENTITY.MFA.FACTOR_NOT_ENROLLED',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_mfa_factor_not_enrolled',
  ),

  /// The passkey could not be verified.
  passkeyVerificationFailed(
    'IDENTITY.PASSKEY.VERIFICATION_FAILED',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_passkey_verification_failed',
  ),

  /// The passkey challenge expired. Try again.
  passkeyChallengeExpired(
    'IDENTITY.PASSKEY.CHALLENGE_EXPIRED',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_passkey_challenge_expired',
  ),

  /// The tenant identifier is already in use. Choose another.
  tenantSlugTaken(
    'IDENTITY.TENANT.SLUG_TAKEN',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_identity_tenant_slug_taken',
  ),

  /// You are not a member of that tenant.
  tenantNotMember(
    'IDENTITY.TENANT.NOT_MEMBER',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_identity_tenant_not_member',
  ),

  /// The tenant must keep at least one owner.
  accessLastOwner(
    'IDENTITY.ACCESS.LAST_OWNER',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_identity_access_last_owner',
  ),

  /// System roles cannot be modified or deleted.
  accessSystemRoleImmutable(
    'IDENTITY.ACCESS.SYSTEM_ROLE_IMMUTABLE',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_identity_access_system_role_immutable',
  ),

  /// A group or role with that name already exists.
  accessNameTaken(
    'IDENTITY.ACCESS.NAME_TAKEN',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_identity_access_name_taken',
  ),

  /// The invitation is not valid, expired or was already used.
  invitationInvalid(
    'IDENTITY.INVITATION.INVALID',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_invitation_invalid',
  ),

  /// The verified email of your account does not match the invitation email.
  invitationEmailMismatch(
    'IDENTITY.INVITATION.EMAIL_MISMATCH',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_identity_invitation_email_mismatch',
  ),

  /// The API key is not valid.
  apiKeyInvalid(
    'IDENTITY.API_KEY.INVALID',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_identity_api_key_invalid',
  ),

  /// The API key expired.
  apiKeyExpired(
    'IDENTITY.API_KEY.EXPIRED',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_identity_api_key_expired',
  ),

  /// The API key cannot be used from this IP address.
  apiKeyIpNotAllowed(
    'IDENTITY.API_KEY.IP_NOT_ALLOWED',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_identity_api_key_ip_not_allowed',
  ),

  /// You cannot grant permissions your account does not have.
  apiKeyPermissionNotGrantable(
    'IDENTITY.API_KEY.PERMISSION_NOT_GRANTABLE',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_identity_api_key_permission_not_grantable',
  ),

  /// The service account is disabled.
  serviceAccountDisabled(
    'IDENTITY.SERVICE_ACCOUNT.DISABLED',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_identity_service_account_disabled',
  );

  const IdentityErrorCode(
    this.code, {
    required this.httpStatus,
    required this.retryable,
    required this.messageKey,
  });

  /// Exact code sent by the backend, for example `IDENTITY.AUTH.INVALID_CREDENTIALS`.
  final String code;

  /// HTTP status the backend responds with.
  final int httpStatus;

  /// Whether the client may retry the same request.
  final bool retryable;

  /// ARB key of the human-readable message.
  final String messageKey;

  /// Same as [code].
  String get wireCode => code;

  /// Value with [code], or null if this client does not know it.
  static IdentityErrorCode? fromCode(String code) {
    for (final value in values) {
      if (value.code == code) return value;
    }
    return null;
  }

  /// Same as [fromCode].
  static IdentityErrorCode? tryParse(String code) => fromCode(code);
}

/// Enum `IdentityRoute` of the `identity` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum IdentityRoute {
  signIn('identity.auth.sign-in'),
  requestMfaChallenge('identity.auth.mfa-challenge'),
  verifyMfa('identity.auth.mfa-verify'),
  refreshSession('identity.auth.refresh'),
  signOut('identity.auth.sign-out'),
  startStepUp('identity.step-up.start'),
  requestStepUpChallenge('identity.step-up.challenge'),
  verifyStepUp('identity.step-up.verify'),
  getSessionAccess('identity.me.access'),
  listSessions('identity.sessions.list'),
  revokeSession('identity.sessions.revoke'),
  revokeOtherSessions('identity.sessions.revoke-others'),
  listDevices('identity.devices.list'),
  signUp('identity.auth.sign-up'),
  resendEmailVerification('identity.auth.email-verification-resend'),
  confirmEmailVerification('identity.auth.email-verification-confirm'),
  changePassword('identity.me.password-change'),
  requestPasswordReset('identity.auth.password-reset-request'),
  confirmPasswordReset('identity.auth.password-reset-confirm'),
  getProfile('identity.me.profile'),
  updateProfile('identity.me.profile-update'),
  requestEmailChange('identity.me.email-change'),
  confirmEmailChange('identity.me.email-change-confirm'),
  getJwks('identity.auth.jwks'),
  removeDevice('identity.devices.remove'),
  untrustDevice('identity.devices.untrust'),
  updatePushToken('identity.devices.push-token'),
  pullDeviceApprovals('identity.device-approvals.pull'),
  denyDeviceApproval('identity.device-approvals.deny'),
  startTotpEnrollment('identity.mfa.totp-start'),
  confirmTotpEnrollment('identity.mfa.totp-confirm'),
  removeTotp('identity.mfa.totp-remove'),
  regenerateRecoveryCodes('identity.mfa.recovery-codes'),
  startMfaRecovery('identity.auth.mfa-recovery-start'),
  confirmMfaRecovery('identity.auth.mfa-recovery-confirm'),
  passkeySignInOptions('identity.auth.passkey-options'),
  passkeySignInVerify('identity.auth.passkey-verify'),
  passkeyMfaOptions('identity.auth.mfa-passkey-options'),
  passkeyMfaVerify('identity.auth.mfa-passkey-verify'),
  passkeyStepUpOptions('identity.step-up.passkey-options'),
  passkeyStepUpVerify('identity.step-up.passkey-verify'),
  listPasskeys('identity.passkeys.list'),
  passkeyRegistrationOptions('identity.passkeys.registration-options'),
  registerPasskey('identity.passkeys.register'),
  removePasskey('identity.passkeys.remove'),
  switchTenant('identity.sessions.switch-tenant'),
  createTenant('identity.tenants.create'),
  getTenant('identity.tenant.get'),
  updateTenant('identity.tenant.update'),
  listMyTenants('identity.me.tenants'),
  listMembers('identity.members.list'),
  removeMember('identity.members.remove'),
  setMemberGroups('identity.members.set-groups'),
  listGroups('identity.groups.list'),
  createGroup('identity.groups.create'),
  updateGroup('identity.groups.update'),
  deleteGroup('identity.groups.delete'),
  setGroupRoles('identity.groups.set-roles'),
  listRoles('identity.roles.list'),
  createRole('identity.roles.create'),
  updateRole('identity.roles.update'),
  deleteRole('identity.roles.delete'),
  inviteUser('identity.invitations.create'),
  listInvitations('identity.invitations.list'),
  revokeInvitation('identity.invitations.revoke'),
  acceptInvitation('identity.invitations.accept'),
  listServiceAccounts('identity.service-accounts.list'),
  createServiceAccount('identity.service-accounts.create'),
  updateServiceAccount('identity.service-accounts.update'),
  deleteServiceAccount('identity.service-accounts.delete'),
  listApiKeys('identity.api-keys.list'),
  createApiKey('identity.api-keys.create'),
  rotateApiKey('identity.api-keys.rotate'),
  revokeApiKey('identity.api-keys.revoke'),
  startAccountDeletion('identity.me.deletion'),
  getSaga('identity.sagas.get');

  const IdentityRoute(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static IdentityRoute? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `IdentityOperation` of the `identity` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum IdentityOperation {
  revokeUserSessions('identity.sessions.revoke-for-user.v1'),
  getUserAccess('identity.users.get-access.v1'),
  suspendUser('identity.users.suspend.v1'),
  reactivateUser('identity.users.reactivate.v1'),
  getUserProfile('identity.users.get-profile.v1'),
  createTenant('identity.tenants.create.v1'),
  discardTenant('identity.tenants.discard.v1'),
  suspendTenant('identity.tenants.suspend.v1'),
  reactivateTenant('identity.tenants.reactivate.v1'),
  authenticateApiKey('identity.api-keys.authenticate.v1'),
  activateTenant('identity.tenants.activate.v1'),
  eraseUser('identity.users.erase.v1'),
  listPushTargets('identity.devices.list-push-targets.v1'),
  listMembersByPermission('identity.members.list-by-permission.v1'),
  tenantMoveSync('identity.tenant-move.sync.v1'),
  tenantMoveFinalize('identity.tenant-move.finalize.v1'),
  tenantMoveAbort('identity.tenant-move.abort.v1'),
  tenantMoveSwitch('identity.tenant-move.switch.v1'),
  tenantMoveCleanup('identity.tenant-move.cleanup.v1'),
  finishTenantMove('identity.tenant-moves.finish.v1');

  const IdentityOperation(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static IdentityOperation? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `IdentityEvent` of the `identity` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum IdentityEvent {
  sessionRevoked('identity.session.revoked.v1'),
  tokensRevoked('identity.tokens.revoked.v1'),
  userRegistered('identity.user.registered.v1'),
  userSuspended('identity.user.suspended.v1'),
  userReactivated('identity.user.reactivated.v1'),
  userEmailChanged('identity.user.email-changed.v1'),
  deviceRegistered('identity.device.registered.v1'),
  deviceRemoved('identity.device.removed.v1'),
  tenantCreated('identity.tenant.created.v1'),
  tenantSuspended('identity.tenant.suspended.v1'),
  tenantReactivated('identity.tenant.reactivated.v1'),
  membershipChanged('identity.membership.changed.v1'),
  permissionsChanged('identity.permissions.changed.v1'),
  apiKeyCreated('identity.api-key.created.v1'),
  apiKeyRevoked('identity.api-key.revoked.v1'),
  securityAlertRaised('identity.security-alert.raised.v1'),
  userErased('identity.user.erased.v1');

  const IdentityEvent(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static IdentityEvent? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `IdentityTopic` of the `identity` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum IdentityTopic {
  events('identity-events');

  const IdentityTopic(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static IdentityTopic? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `IdentityCommand` of the `identity` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum IdentityCommand {
  sendPasswordReset('identity.password-reset.send.v1');

  const IdentityCommand(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static IdentityCommand? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `IdentityQueue` of the `identity` contract.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum IdentityQueue {
  accessProjection('identity-access-projection'),
  authState('identity-auth-state'),
  billing('identity-billing'),
  passwordResets('identity-password-resets');

  const IdentityQueue(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static IdentityQueue? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Saga orchestrated by identity.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum IdentitySaga {
  tenantOnboarding('identity.tenant-onboarding'),
  deleteAccount('identity.delete-account'),
  moveTenant('identity.move-tenant');

  const IdentitySaga(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static IdentitySaga? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Status of an identity saga.
///
/// [tryParse] returns null for values this client does not know,
/// so a new backend value is ignored instead of breaking.
enum IdentitySagaStatus {
  running('running'),
  suspended('suspended'),
  compensating('compensating'),
  completed('completed'),
  compensated('compensated'),
  compensationFailed('compensation_failed'),
  requiresIntervention('requires_intervention');

  const IdentitySagaStatus(this.wireCode);

  /// Value used by the backend.
  final String wireCode;

  /// Value whose `wireCode` is [code], or null if unknown.
  static IdentitySagaStatus? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}
