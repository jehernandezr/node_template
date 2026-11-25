// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen

/// Messages for the public error codes of the contracts.
library;

import 'app_localizations.dart';

/// Localized message for a public error code [code].
///
/// An unknown code returns `errorFallback`.
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
    'PLATFORM.AUTH.TOKEN_EXPIRED' => l10n.error_platform_auth_token_expired,
    'PLATFORM.AUTH.ORIGIN_REJECTED' => l10n.error_platform_auth_origin_rejected,
    'PLATFORM.RATE_LIMIT.EXCEEDED' => l10n.error_platform_rate_limit_exceeded,
    'PLATFORM.API.VERSION_SUNSET' => l10n.error_platform_api_version_sunset,
    'PLATFORM.API.UNSUPPORTED_VERSION' =>
      l10n.error_platform_api_unsupported_version,
    'PLATFORM.HTTP.PAYLOAD_TOO_LARGE' =>
      l10n.error_platform_http_payload_too_large,
    'PLATFORM.HTTP.UNSUPPORTED_MEDIA_TYPE' =>
      l10n.error_platform_http_unsupported_media_type,
    'PLATFORM.HTTP.MALFORMED_BODY' => l10n.error_platform_http_malformed_body,
    'PLATFORM.ACCESS.FEATURE_NOT_INCLUDED' =>
      l10n.error_platform_access_feature_not_included,
    'PLATFORM.ACCESS.FLAG_DISABLED' => l10n.error_platform_access_flag_disabled,
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
    'PLATFORM.SHARDING.WRONG_REGION' =>
      l10n.error_platform_sharding_wrong_region,
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
    'BILLING.SUBSCRIPTION.NOT_FOUND' =>
      l10n.error_billing_subscription_not_found,
    'BILLING.SUBSCRIPTION.NOT_CHANGEABLE' =>
      l10n.error_billing_subscription_not_changeable,
    'BILLING.PLAN.NOT_AVAILABLE' => l10n.error_billing_plan_not_available,
    'BILLING.PLAN.USAGE_EXCEEDS_LIMIT' =>
      l10n.error_billing_plan_usage_exceeds_limit,
    'BILLING.INVOICE.NOT_FOUND' => l10n.error_billing_invoice_not_found,
    'BILLING.INVOICE.INVALID_STATE' => l10n.error_billing_invoice_invalid_state,
    'BILLING.INVOICE.AMOUNT_MISMATCH' =>
      l10n.error_billing_invoice_amount_mismatch,
    'BILLING.QUOTA.EXCEEDED' => l10n.error_billing_quota_exceeded,
    'IDENTITY.AUTH.INVALID_CREDENTIALS' =>
      l10n.error_identity_auth_invalid_credentials,
    'IDENTITY.MFA.TOKEN_INVALID' => l10n.error_identity_mfa_token_invalid,
    'IDENTITY.MFA.CODE_INVALID' => l10n.error_identity_mfa_code_invalid,
    'IDENTITY.MFA.CODE_EXPIRED' => l10n.error_identity_mfa_code_expired,
    'IDENTITY.MFA.TOO_MANY_ATTEMPTS' =>
      l10n.error_identity_mfa_too_many_attempts,
    'IDENTITY.MFA.STEP_UP_REQUIRED' => l10n.error_identity_mfa_step_up_required,
    'IDENTITY.MFA.METHOD_UNAVAILABLE' =>
      l10n.error_identity_mfa_method_unavailable,
    'IDENTITY.SESSION.REVOKED' => l10n.error_identity_session_revoked,
    'IDENTITY.SESSION.EXPIRED' => l10n.error_identity_session_expired,
    'IDENTITY.SESSION.REUSED' => l10n.error_identity_session_reused,
    'IDENTITY.TOKEN.STALE_PERMISSIONS' =>
      l10n.error_identity_token_stale_permissions,
    'IDENTITY.TOKEN.REVOKED' => l10n.error_identity_token_revoked,
    'IDENTITY.USER.SUSPENDED' => l10n.error_identity_user_suspended,
    'IDENTITY.TENANT.SUSPENDED' => l10n.error_identity_tenant_suspended,
    'IDENTITY.AUTH.EMAIL_NOT_VERIFIED' =>
      l10n.error_identity_auth_email_not_verified,
    'IDENTITY.USER.EMAIL_VERIFICATION_INVALID' =>
      l10n.error_identity_user_email_verification_invalid,
    'IDENTITY.PASSWORD.POLICY_VIOLATION' =>
      l10n.error_identity_password_policy_violation,
    'IDENTITY.PASSWORD.BREACHED' => l10n.error_identity_password_breached,
    'IDENTITY.PASSWORD.CURRENT_INVALID' =>
      l10n.error_identity_password_current_invalid,
    'IDENTITY.PASSWORD.RESET_INVALID' =>
      l10n.error_identity_password_reset_invalid,
    'IDENTITY.DEVICE.SIGNATURE_INVALID' =>
      l10n.error_identity_device_signature_invalid,
    'IDENTITY.DEVICE.KEY_INVALID' => l10n.error_identity_device_key_invalid,
    'IDENTITY.MFA.RECOVERY_NOT_READY' =>
      l10n.error_identity_mfa_recovery_not_ready,
    'IDENTITY.MFA.FACTOR_ALREADY_ENROLLED' =>
      l10n.error_identity_mfa_factor_already_enrolled,
    'IDENTITY.MFA.FACTOR_NOT_ENROLLED' =>
      l10n.error_identity_mfa_factor_not_enrolled,
    'IDENTITY.PASSKEY.VERIFICATION_FAILED' =>
      l10n.error_identity_passkey_verification_failed,
    'IDENTITY.PASSKEY.CHALLENGE_EXPIRED' =>
      l10n.error_identity_passkey_challenge_expired,
    'IDENTITY.TENANT.SLUG_TAKEN' => l10n.error_identity_tenant_slug_taken,
    'IDENTITY.TENANT.NOT_MEMBER' => l10n.error_identity_tenant_not_member,
    'IDENTITY.ACCESS.LAST_OWNER' => l10n.error_identity_access_last_owner,
    'IDENTITY.ACCESS.SYSTEM_ROLE_IMMUTABLE' =>
      l10n.error_identity_access_system_role_immutable,
    'IDENTITY.ACCESS.NAME_TAKEN' => l10n.error_identity_access_name_taken,
    'IDENTITY.INVITATION.INVALID' => l10n.error_identity_invitation_invalid,
    'IDENTITY.INVITATION.EMAIL_MISMATCH' =>
      l10n.error_identity_invitation_email_mismatch,
    'IDENTITY.API_KEY.INVALID' => l10n.error_identity_api_key_invalid,
    'IDENTITY.API_KEY.EXPIRED' => l10n.error_identity_api_key_expired,
    'IDENTITY.API_KEY.IP_NOT_ALLOWED' =>
      l10n.error_identity_api_key_ip_not_allowed,
    'IDENTITY.API_KEY.PERMISSION_NOT_GRANTABLE' =>
      l10n.error_identity_api_key_permission_not_grantable,
    'IDENTITY.SERVICE_ACCOUNT.DISABLED' =>
      l10n.error_identity_service_account_disabled,
    'NOTIFICATIONS.INBOX.NOT_FOUND' => l10n.error_notifications_inbox_not_found,
    'NOTIFICATIONS.PREFERENCES.INVALID_QUIET_HOURS' =>
      l10n.error_notifications_preferences_invalid_quiet_hours,
    'NOTIFICATIONS.REALTIME.UNAUTHENTICATED' =>
      l10n.error_notifications_realtime_unauthenticated,
    'REPORTS.RUN.NOT_FOUND' => l10n.error_reports_run_not_found,
    'REPORTS.RUN.NOT_READY' => l10n.error_reports_run_not_ready,
    'REPORTS.RUN.EXPIRED' => l10n.error_reports_run_expired,
    'REPORTS.TYPE.UNKNOWN' => l10n.error_reports_type_unknown,
    'REPORTS.PARAMS.INVALID_RANGE' => l10n.error_reports_params_invalid_range,
    'REPORTS.RESULT.TOO_LARGE' => l10n.error_reports_result_too_large,
    'TASKS.TASK.NOT_FOUND' => l10n.error_tasks_task_not_found,
    'TASKS.TASK.VERSION_CONFLICT' => l10n.error_tasks_task_version_conflict,
    'TASKS.SEARCH.QUERY_TOO_SHORT' => l10n.error_tasks_search_query_too_short,
    _ => l10n.errorFallback,
  };
}
