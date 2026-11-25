// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

/// Permiso dentro de un tenant.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
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

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static Permission? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Rol de plataforma.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum PlatformRole {
  superAdmin('super_admin'),
  support('support'),
  finance('finance'),
  readOnly('read_only');

  const PlatformRole(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static PlatformRole? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Funcionalidad del plan.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum PlanFeature {
  aiAssistant('ai_assistant'),
  webhooks('webhooks'),
  billing('billing'),
  advancedReports('advanced_reports');

  const PlanFeature(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static PlanFeature? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Feature flag.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum FeatureFlag {
  newReports('new_reports');

  const FeatureFlag(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static FeatureFlag? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Second factor method.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum MfaFactor {
  deviceOtp('device_otp'),
  emailOtp('email_otp'),
  totp('totp'),
  recoveryCode('recovery_code'),
  passkey('passkey');

  const MfaFactor(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static MfaFactor? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Result of a sign-in.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum SignInStatus {
  authenticated('authenticated'),
  mfaRequired('mfa_required');

  const SignInStatus(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static SignInStatus? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Plataforma del cliente.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum ClientPlatform {
  ios('ios'),
  android('android'),
  web('web'),
  macos('macos'),
  windows('windows'),
  linux('linux');

  const ClientPlatform(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static ClientPlatform? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Motivo de una revocación.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum RevocationReason {
  logout('logout'),
  userAction('user_action'),
  passwordChanged('password_changed'),
  adminAction('admin_action'),
  compromised('compromised');

  const RevocationReason(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static RevocationReason? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Alcance de una revocación de tokens.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum RevocationScope {
  session('session'),
  user('user'),
  tenant('tenant');

  const RevocationScope(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static RevocationScope? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Method with which the session was authenticated (amr).
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum AuthMethodReference {
  password('pwd'),
  passkey('passkey'),
  device('device'),
  emailOtp('email_otp'),
  totp('totp'),
  recoveryCode('recovery_code');

  const AuthMethodReference(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static AuthMethodReference? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Destinatario de un access token.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum TokenAudience {
  api('api'),
  backoffice('backoffice');

  const TokenAudience(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static TokenAudience? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Rol de sistema de un tenant.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum TenantRole {
  owner('owner'),
  admin('admin'),
  member('member'),
  billing('billing');

  const TenantRole(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static TenantRole? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Tipo de tenant.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum TenantKind {
  organization('organization'),
  sharedCustomers('shared_customers'),
  platform('platform');

  const TenantKind(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static TenantKind? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Ciclo de vida de un tenant.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum TenantLifecycle {
  provisioning('provisioning'),
  active('active'),
  suspended('suspended'),
  deleting('deleting');

  const TenantLifecycle(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static TenantLifecycle? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Estado de una invitación.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum InvitationStatus {
  pending('pending'),
  accepted('accepted'),
  revoked('revoked'),
  expired('expired');

  const InvitationStatus(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static InvitationStatus? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Qué cambió en la membresía de un usuario.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum MembershipChangeKind {
  added('added'),
  removed('removed'),
  groupsChanged('groups_changed');

  const MembershipChangeKind(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static MembershipChangeKind? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Estado de la cuenta de un usuario.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum UserStatus {
  pendingVerification('pending_verification'),
  active('active'),
  suspended('suspended'),
  deleted('deleted');

  const UserStatus(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static UserStatus? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Alerta de seguridad sobre una cuenta.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
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

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static SecurityAlertType? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Entorno de una API key.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum ApiKeyEnvironment {
  live('live'),
  test('test');

  const ApiKeyEnvironment(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static ApiKeyEnvironment? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Estado de una API key.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum ApiKeyStatus {
  active('active'),
  rotated('rotated'),
  revoked('revoked');

  const ApiKeyStatus(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static ApiKeyStatus? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Estado de una service account.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum ServiceAccountStatus {
  active('active'),
  disabled('disabled');

  const ServiceAccountStatus(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static ServiceAccountStatus? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Códigos de error públicos del contrato `identity`.
///
/// Solo incluye los códigos con audiencia `public`: los internos nunca
/// llegan al cliente. [messageKey] es la clave del mensaje en el ARB.
enum IdentityErrorCode {
  /// El email o la contraseña no son válidos, o el origen está bloqueado por intentos fallidos.
  authInvalidCredentials(
    'IDENTITY.AUTH.INVALID_CREDENTIALS',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_identity_auth_invalid_credentials',
  ),

  /// El desafío MFA no existe o venció. Inicia sesión de nuevo.
  mfaTokenInvalid(
    'IDENTITY.MFA.TOKEN_INVALID',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_identity_mfa_token_invalid',
  ),

  /// El código de verificación no es correcto.
  mfaCodeInvalid(
    'IDENTITY.MFA.CODE_INVALID',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_mfa_code_invalid',
  ),

  /// El código de verificación expiró. Solicita uno nuevo.
  mfaCodeExpired(
    'IDENTITY.MFA.CODE_EXPIRED',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_mfa_code_expired',
  ),

  /// Se agotaron los intentos del desafío. Solicita uno nuevo.
  mfaTooManyAttempts(
    'IDENTITY.MFA.TOO_MANY_ATTEMPTS',
    httpStatus: 429,
    retryable: false,
    messageKey: 'error_identity_mfa_too_many_attempts',
  ),

  /// La operación exige verificar de nuevo el segundo factor.
  mfaStepUpRequired(
    'IDENTITY.MFA.STEP_UP_REQUIRED',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_identity_mfa_step_up_required',
  ),

  /// El método pedido no está entre los que ofreció el desafío MFA. Elige otro.
  mfaMethodUnavailable(
    'IDENTITY.MFA.METHOD_UNAVAILABLE',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_mfa_method_unavailable',
  ),

  /// La sesión fue cerrada. Inicia sesión de nuevo.
  sessionRevoked(
    'IDENTITY.SESSION.REVOKED',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_identity_session_revoked',
  ),

  /// La sesión venció por inactividad o por el tope absoluto. Inicia sesión de nuevo.
  sessionExpired(
    'IDENTITY.SESSION.EXPIRED',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_identity_session_expired',
  ),

  /// Se presentó un session token ya rotado. La sesión completa quedó revocada. Inicia sesión de nuevo.
  sessionReused(
    'IDENTITY.SESSION.REUSED',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_identity_session_reused',
  ),

  /// Los permisos cambiaron desde que se emitió el token. El cliente refresca y reintenta.
  tokenStalePermissions(
    'IDENTITY.TOKEN.STALE_PERMISSIONS',
    httpStatus: 401,
    retryable: true,
    messageKey: 'error_identity_token_stale_permissions',
  ),

  /// El access token fue revocado por la época del usuario o del tenant. Inicia sesión de nuevo.
  tokenRevoked(
    'IDENTITY.TOKEN.REVOKED',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_identity_token_revoked',
  ),

  /// El usuario está suspendido. Sus sesiones quedan cerradas hasta que se reactive.
  userSuspended(
    'IDENTITY.USER.SUSPENDED',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_identity_user_suspended',
  ),

  /// El tenant está suspendido. Las sesiones en él quedan cerradas hasta que se reactive.
  tenantSuspended(
    'IDENTITY.TENANT.SUSPENDED',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_identity_tenant_suspended',
  ),

  /// El email todavía no está verificado. Confirma el enlace que enviamos a tu correo.
  authEmailNotVerified(
    'IDENTITY.AUTH.EMAIL_NOT_VERIFIED',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_identity_auth_email_not_verified',
  ),

  /// El enlace de verificación del email no es válido o venció. Solicita uno nuevo.
  userEmailVerificationInvalid(
    'IDENTITY.USER.EMAIL_VERIFICATION_INVALID',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_user_email_verification_invalid',
  ),

  /// La contraseña no cumple la política: de 12 a 128 caracteres y distinta del email.
  passwordPolicyViolation(
    'IDENTITY.PASSWORD.POLICY_VIOLATION',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_password_policy_violation',
  ),

  /// La contraseña aparece en filtraciones conocidas. Elige otra.
  passwordBreached(
    'IDENTITY.PASSWORD.BREACHED',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_password_breached',
  ),

  /// La contraseña actual no es correcta.
  passwordCurrentInvalid(
    'IDENTITY.PASSWORD.CURRENT_INVALID',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_password_current_invalid',
  ),

  /// El enlace para restablecer la contraseña no es válido o venció. Solicita uno nuevo.
  passwordResetInvalid(
    'IDENTITY.PASSWORD.RESET_INVALID',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_password_reset_invalid',
  ),

  /// La firma del dispositivo no es válida.
  deviceSignatureInvalid(
    'IDENTITY.DEVICE.SIGNATURE_INVALID',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_identity_device_signature_invalid',
  ),

  /// La clave pública del dispositivo no es válida.
  deviceKeyInvalid(
    'IDENTITY.DEVICE.KEY_INVALID',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_device_key_invalid',
  ),

  /// La recuperación del segundo factor todavía no está disponible. Intenta de nuevo cuando termine la espera.
  mfaRecoveryNotReady(
    'IDENTITY.MFA.RECOVERY_NOT_READY',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_identity_mfa_recovery_not_ready',
  ),

  /// Ese segundo factor ya está activo.
  mfaFactorAlreadyEnrolled(
    'IDENTITY.MFA.FACTOR_ALREADY_ENROLLED',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_identity_mfa_factor_already_enrolled',
  ),

  /// Ese segundo factor no está activo.
  mfaFactorNotEnrolled(
    'IDENTITY.MFA.FACTOR_NOT_ENROLLED',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_mfa_factor_not_enrolled',
  ),

  /// No se pudo verificar la passkey.
  passkeyVerificationFailed(
    'IDENTITY.PASSKEY.VERIFICATION_FAILED',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_passkey_verification_failed',
  ),

  /// El desafío de la passkey venció. Inténtalo de nuevo.
  passkeyChallengeExpired(
    'IDENTITY.PASSKEY.CHALLENGE_EXPIRED',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_passkey_challenge_expired',
  ),

  /// El identificador del tenant ya está en uso. Elige otro.
  tenantSlugTaken(
    'IDENTITY.TENANT.SLUG_TAKEN',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_identity_tenant_slug_taken',
  ),

  /// No eres miembro de ese tenant.
  tenantNotMember(
    'IDENTITY.TENANT.NOT_MEMBER',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_identity_tenant_not_member',
  ),

  /// El tenant debe conservar al menos un propietario.
  accessLastOwner(
    'IDENTITY.ACCESS.LAST_OWNER',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_identity_access_last_owner',
  ),

  /// Los roles de sistema no se pueden modificar ni borrar.
  accessSystemRoleImmutable(
    'IDENTITY.ACCESS.SYSTEM_ROLE_IMMUTABLE',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_identity_access_system_role_immutable',
  ),

  /// Ya existe un grupo o rol con ese nombre.
  accessNameTaken(
    'IDENTITY.ACCESS.NAME_TAKEN',
    httpStatus: 409,
    retryable: false,
    messageKey: 'error_identity_access_name_taken',
  ),

  /// La invitación no es válida, venció o ya se usó.
  invitationInvalid(
    'IDENTITY.INVITATION.INVALID',
    httpStatus: 400,
    retryable: false,
    messageKey: 'error_identity_invitation_invalid',
  ),

  /// El email verificado de tu cuenta no coincide con el de la invitación.
  invitationEmailMismatch(
    'IDENTITY.INVITATION.EMAIL_MISMATCH',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_identity_invitation_email_mismatch',
  ),

  /// La API key no es válida.
  apiKeyInvalid(
    'IDENTITY.API_KEY.INVALID',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_identity_api_key_invalid',
  ),

  /// La API key venció.
  apiKeyExpired(
    'IDENTITY.API_KEY.EXPIRED',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_identity_api_key_expired',
  ),

  /// La API key no puede usarse desde esta dirección IP.
  apiKeyIpNotAllowed(
    'IDENTITY.API_KEY.IP_NOT_ALLOWED',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_identity_api_key_ip_not_allowed',
  ),

  /// No puedes otorgar permisos que tu cuenta no tiene.
  apiKeyPermissionNotGrantable(
    'IDENTITY.API_KEY.PERMISSION_NOT_GRANTABLE',
    httpStatus: 403,
    retryable: false,
    messageKey: 'error_identity_api_key_permission_not_grantable',
  ),

  /// La cuenta de servicio está deshabilitada.
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

  /// Código exacto que envía el backend, por ejemplo `IDENTITY.AUTH.INVALID_CREDENTIALS`.
  final String code;

  /// Estado HTTP con el que responde el backend.
  final int httpStatus;

  /// Si el cliente puede reintentar la misma petición.
  final bool retryable;

  /// Clave ARB del mensaje para personas.
  final String messageKey;

  /// Igual a [code].
  String get wireCode => code;

  /// Valor con [code], o null si este cliente no lo conoce.
  static IdentityErrorCode? fromCode(String code) {
    for (final value in values) {
      if (value.code == code) return value;
    }
    return null;
  }

  /// Igual a [fromCode].
  static IdentityErrorCode? tryParse(String code) => fromCode(code);
}

/// Enum `IdentityRoute` del contrato `identity`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
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

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static IdentityRoute? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `IdentityOperation` del contrato `identity`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
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

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static IdentityOperation? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `IdentityEvent` del contrato `identity`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
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

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static IdentityEvent? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `IdentityTopic` del contrato `identity`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum IdentityTopic {
  events('identity-events');

  const IdentityTopic(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static IdentityTopic? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Enum `IdentityQueue` del contrato `identity`.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum IdentityQueue {
  accessProjection('identity-access-projection'),
  authState('identity-auth-state'),
  billing('identity-billing');

  const IdentityQueue(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static IdentityQueue? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Saga que orquesta identity.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum IdentitySaga {
  tenantOnboarding('identity.tenant-onboarding'),
  deleteAccount('identity.delete-account'),
  moveTenant('identity.move-tenant');

  const IdentitySaga(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static IdentitySaga? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}

/// Estado de una saga de identity.
///
/// [tryParse] devuelve null para valores que este cliente no conoce,
/// así un valor nuevo del backend se ignora sin romper.
enum IdentitySagaStatus {
  running('running'),
  suspended('suspended'),
  compensating('compensating'),
  completed('completed'),
  compensated('compensated'),
  compensationFailed('compensation_failed'),
  requiresIntervention('requires_intervention');

  const IdentitySagaStatus(this.wireCode);

  /// Valor que usa el backend.
  final String wireCode;

  /// Valor con [code] como `wireCode`, o null si es desconocido.
  static IdentitySagaStatus? tryParse(String code) {
    for (final value in values) {
      if (value.wireCode == code) return value;
    }
    return null;
  }
}
