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
  backofficeAccess('backoffice:access');

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
  billing('billing');

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

/// Método de segundo factor.
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

/// Resultado de un inicio de sesión.
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

  /// La sesión fue cerrada. Inicia sesión de nuevo.
  sessionRevoked(
    'IDENTITY.SESSION.REVOKED',
    httpStatus: 401,
    retryable: false,
    messageKey: 'error_identity_session_revoked',
  ),

  /// Los permisos cambiaron desde que se emitió el token. El cliente refresca y reintenta.
  tokenStalePermissions(
    'IDENTITY.TOKEN.STALE_PERMISSIONS',
    httpStatus: 401,
    retryable: true,
    messageKey: 'error_identity_token_stale_permissions',
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
  verifyMfa('identity.auth.mfa-verify'),
  listSessions('identity.sessions.list'),
  revokeSession('identity.sessions.revoke'),
  revokeOtherSessions('identity.sessions.revoke-others'),
  listDevices('identity.devices.list');

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
  revokeUserSessions('identity.sessions.revoke-for-user'),
  getUserAccess('identity.users.get-access');

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
  tokensRevoked('identity.tokens.revoked.v1');

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
