// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

/// Mensajes de los códigos de error públicos de los contratos.
library;

import 'app_localizations.dart';

/// Mensaje localizado de un código de error público [code].
///
/// Un código desconocido devuelve `errorFallback`.
String errorMessageFor(AppLocalizations l10n, String code) {
  return switch (code) {
    'PLATFORM.VALIDATION.INVALID_INPUT' =>
      l10n.error_platform_validation_invalid_input,
    'PLATFORM.VALIDATION.REQUIRED' => l10n.error_platform_validation_required,
    'PLATFORM.VALIDATION.INVALID_TYPE' =>
      l10n.error_platform_validation_invalid_type,
    'PLATFORM.VALIDATION.INVALID_FORMAT' =>
      l10n.error_platform_validation_invalid_format,
    'PLATFORM.VALIDATION.INVALID_ENUM' =>
      l10n.error_platform_validation_invalid_enum,
    'PLATFORM.VALIDATION.TOO_SHORT' => l10n.error_platform_validation_too_short,
    'PLATFORM.VALIDATION.TOO_LONG' => l10n.error_platform_validation_too_long,
    'PLATFORM.VALIDATION.TOO_SMALL' => l10n.error_platform_validation_too_small,
    'PLATFORM.VALIDATION.TOO_LARGE' => l10n.error_platform_validation_too_large,
    'PLATFORM.VALIDATION.UNKNOWN_FIELD' =>
      l10n.error_platform_validation_unknown_field,
    'PLATFORM.INTERNAL.UNEXPECTED' => l10n.error_platform_internal_unexpected,
    'PLATFORM.AUTH.UNAUTHENTICATED' => l10n.error_platform_auth_unauthenticated,
    'PLATFORM.AUTH.FORBIDDEN' => l10n.error_platform_auth_forbidden,
    'PLATFORM.RATE_LIMIT.EXCEEDED' => l10n.error_platform_rate_limit_exceeded,
    'PLATFORM.API.VERSION_SUNSET' => l10n.error_platform_api_version_sunset,
    'PLATFORM.RESOURCE.NOT_FOUND' => l10n.error_platform_resource_not_found,
    'PLATFORM.CONFLICT.VERSION_MISMATCH' =>
      l10n.error_platform_conflict_version_mismatch,
    'PLATFORM.KERNEL.INVALID_ID' => l10n.error_platform_kernel_invalid_id,
    'PLATFORM.SHARDING.KEY_MISSING' => l10n.error_platform_sharding_key_missing,
    'PLATFORM.SHARDING.CROSS_SHARD_TX' =>
      l10n.error_platform_sharding_cross_shard_tx,
    'PLATFORM.SHARDING.TENANT_MIGRATING' =>
      l10n.error_platform_sharding_tenant_migrating,
    'PLATFORM.SHARDING.TENANT_NOT_WRITABLE' =>
      l10n.error_platform_sharding_tenant_not_writable,
    'PLATFORM.CRITERIA.UNKNOWN_FIELD' =>
      l10n.error_platform_criteria_unknown_field,
    'PLATFORM.CRITERIA.INVALID_VALUE' =>
      l10n.error_platform_criteria_invalid_value,
    'PLATFORM.CRITERIA.INVALID_LIMIT' =>
      l10n.error_platform_criteria_invalid_limit,
    'PLATFORM.RESILIENCE.CIRCUIT_OPEN' =>
      l10n.error_platform_resilience_circuit_open,
    'PLATFORM.RESILIENCE.TIMEOUT' => l10n.error_platform_resilience_timeout,
    'PLATFORM.RESILIENCE.BULKHEAD_FULL' =>
      l10n.error_platform_resilience_bulkhead_full,
    'PLATFORM.RESILIENCE.OVERLOADED' =>
      l10n.error_platform_resilience_overloaded,
    'IDENTITY.AUTH.INVALID_CREDENTIALS' =>
      l10n.error_identity_auth_invalid_credentials,
    'IDENTITY.MFA.TOKEN_INVALID' => l10n.error_identity_mfa_token_invalid,
    'IDENTITY.MFA.CODE_INVALID' => l10n.error_identity_mfa_code_invalid,
    'IDENTITY.MFA.CODE_EXPIRED' => l10n.error_identity_mfa_code_expired,
    'IDENTITY.MFA.TOO_MANY_ATTEMPTS' =>
      l10n.error_identity_mfa_too_many_attempts,
    'IDENTITY.MFA.STEP_UP_REQUIRED' => l10n.error_identity_mfa_step_up_required,
    'IDENTITY.SESSION.REVOKED' => l10n.error_identity_session_revoked,
    'IDENTITY.TOKEN.STALE_PERMISSIONS' =>
      l10n.error_identity_token_stale_permissions,
    _ => l10n.errorFallback,
  };
}
