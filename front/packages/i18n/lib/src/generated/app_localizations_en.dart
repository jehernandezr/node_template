// ignore_for_file: deprecated_member_use

// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'Platform';

  @override
  String get actionRetry => 'Retry';

  @override
  String get actionCancel => 'Cancel';

  @override
  String get actionSave => 'Save';

  @override
  String get actionSignIn => 'Sign in';

  @override
  String get actionSignOut => 'Sign out';

  @override
  String get menuMore => 'More';

  @override
  String get demoModeTitle => 'Demo mode';

  @override
  String get demoModeHint =>
      'You are viewing sample data. Choose a profile to sign in.';

  @override
  String get demoSignInCustomer => 'Sign in as customer';

  @override
  String get demoSignInCustomerNoAssistant =>
      'Sign in as customer without assistant';

  @override
  String get demoSignInTenantAdmin => 'Sign in as tenant administrator';

  @override
  String get demoSignInSuperAdmin => 'Sign in as super administrator';

  @override
  String get forbiddenTitle => 'Access denied';

  @override
  String get forbiddenMessage =>
      'You do not have permission to view this page.';

  @override
  String get stepUpTitle => 'Additional verification';

  @override
  String get stepUpMessage =>
      'This section requires you to confirm your identity with a second factor.';

  @override
  String get stepUpDemoVerify => 'Verify (demo)';

  @override
  String get signInEmail => 'Email';

  @override
  String get signInPassword => 'Password';

  @override
  String get mfaChooseMethod =>
      'Choose how you want to get the verification code.';

  @override
  String get mfaMethodDeviceOtp => 'Code on your trusted device';

  @override
  String get mfaMethodEmailOtp => 'Code by email';

  @override
  String get mfaMethodTotp => 'Authenticator app';

  @override
  String get mfaMethodRecoveryCode => 'Recovery code';

  @override
  String get mfaCode => 'Verification code';

  @override
  String get mfaVerify => 'Verify';

  @override
  String get goHome => 'Go to home';

  @override
  String get loading => 'Loading';

  @override
  String get errorCodeLabel => 'Code';

  @override
  String get errorTraceIdLabel => 'Trace ID';

  @override
  String errorCodeLine(String code) {
    return 'Code: $code';
  }

  @override
  String errorTraceIdLine(String traceId) {
    return 'Trace ID: $traceId';
  }

  @override
  String get metaSeparator => ' · ';

  @override
  String get notFound => 'Page not found.';

  @override
  String get confirm => 'Confirm';

  @override
  String get delete => 'Delete';

  @override
  String get edit => 'Edit';

  @override
  String get close => 'Close';

  @override
  String get back => 'Back';

  @override
  String get search => 'Search';

  @override
  String get loadMore => 'Load more';

  @override
  String get emptyListTitle => 'There are no items yet.';

  @override
  String get error_platform_validation_invalid_input =>
      'Check the data. A field has an invalid format.';

  @override
  String get error_platform_validation_required =>
      'A required field is missing.';

  @override
  String get error_platform_internal_unexpected =>
      'An unexpected error occurred. Try again.';

  @override
  String get error_platform_auth_unauthenticated => 'Sign in to continue.';

  @override
  String get error_platform_auth_forbidden =>
      'You do not have permission to do this.';

  @override
  String get error_platform_rate_limit_exceeded =>
      'Too many requests. Wait a moment and try again.';

  @override
  String get error_platform_api_version_sunset =>
      'This version of the app is no longer available. Update it.';

  @override
  String get error_platform_resource_not_found =>
      'We could not find what you are looking for.';

  @override
  String get error_platform_conflict_version_mismatch =>
      'The content changed. Reload it.';

  @override
  String get error_platform_kernel_invalid_id => 'The identifier is not valid.';

  @override
  String get error_platform_sharding_key_missing =>
      'A required piece of data is missing from the request.';

  @override
  String get error_platform_sharding_cross_shard_tx =>
      'This operation cannot be completed with data stored in different places.';

  @override
  String get error_platform_sharding_tenant_migrating =>
      'We are updating your data. Try again in a few minutes.';

  @override
  String get error_platform_validation_invalid_type =>
      'A field has an invalid data type.';

  @override
  String get error_platform_validation_invalid_format =>
      'A field does not have the expected format.';

  @override
  String get error_platform_validation_invalid_enum =>
      'Choose one of the allowed options.';

  @override
  String get error_platform_validation_too_short => 'The value is too short.';

  @override
  String get error_platform_validation_too_long => 'The value is too long.';

  @override
  String get error_platform_validation_too_small =>
      'The value is below the allowed minimum.';

  @override
  String get error_platform_validation_too_large =>
      'The value is above the allowed maximum.';

  @override
  String get error_platform_validation_unknown_field =>
      'The request includes unexpected data.';

  @override
  String get error_platform_sharding_tenant_not_writable =>
      'We are doing maintenance. For now you can only view data.';

  @override
  String get error_platform_sharding_wrong_region =>
      'Your organization lives in another region. Retrying there.';

  @override
  String get error_platform_criteria_unknown_field =>
      'You cannot filter or sort by that field.';

  @override
  String get error_platform_criteria_invalid_value =>
      'The search has an invalid value.';

  @override
  String get error_platform_criteria_invalid_limit =>
      'The number of results per page is not valid.';

  @override
  String get error_platform_resilience_circuit_open =>
      'A service is not available right now. Try again in a few minutes.';

  @override
  String get error_platform_resilience_timeout =>
      'The operation took too long. Try again.';

  @override
  String get error_platform_resilience_bulkhead_full =>
      'There are many operations in progress. Try again in a moment.';

  @override
  String get error_platform_resilience_overloaded =>
      'The service is busy. Try again in a moment.';

  @override
  String get error_platform_dependency_unavailable =>
      'A service is temporarily unavailable. Try again in a moment.';

  @override
  String get error_platform_auth_token_expired =>
      'Your access expired. Refreshing the session.';

  @override
  String get error_platform_auth_origin_rejected =>
      'This request does not come from an allowed origin.';

  @override
  String get error_platform_api_unsupported_version =>
      'This version of the app is not supported. Update it.';

  @override
  String get error_platform_http_payload_too_large =>
      'What you sent is too large.';

  @override
  String get error_platform_http_unsupported_media_type =>
      'That type of content cannot be sent.';

  @override
  String get error_platform_http_malformed_body =>
      'What you sent could not be read. Try again.';

  @override
  String get error_identity_auth_invalid_credentials =>
      'The email or password is not correct.';

  @override
  String get error_identity_mfa_token_invalid =>
      'The verification expired. Sign in again.';

  @override
  String get error_identity_mfa_code_invalid => 'The code is not correct.';

  @override
  String get error_identity_mfa_code_expired =>
      'The code expired. Request a new one.';

  @override
  String get error_identity_mfa_too_many_attempts =>
      'You used all the attempts. Request a new code.';

  @override
  String get error_identity_mfa_step_up_required =>
      'Confirm your identity to continue.';

  @override
  String get error_identity_session_revoked =>
      'Your session was closed. Sign in again.';

  @override
  String get error_identity_token_stale_permissions =>
      'Your permissions changed. Refreshing the session.';

  @override
  String get error_identity_mfa_method_unavailable =>
      'That verification method is not available. Choose another one.';

  @override
  String get error_identity_session_expired =>
      'Your session expired. Sign in again.';

  @override
  String get error_identity_session_reused =>
      'We closed your session for security. Sign in again.';

  @override
  String get error_identity_token_revoked =>
      'Your access was revoked. Sign in again.';

  @override
  String get error_identity_user_suspended =>
      'Your account is suspended. Contact support.';

  @override
  String get error_identity_tenant_suspended =>
      'Your organization is suspended. Contact support.';

  @override
  String get error_identity_auth_email_not_verified =>
      'Verify your email to continue. Check the link we sent you.';

  @override
  String get error_identity_user_email_verification_invalid =>
      'The verification link is invalid or expired. Request a new one.';

  @override
  String get error_identity_password_policy_violation =>
      'The password must be 12 to 128 characters long and different from your email.';

  @override
  String get error_identity_password_breached =>
      'That password appeared in known data leaks. Choose another one.';

  @override
  String get error_identity_password_current_invalid =>
      'The current password is not correct.';

  @override
  String get error_identity_password_reset_invalid =>
      'The password reset link is invalid or expired. Request a new one.';

  @override
  String get error_identity_device_signature_invalid =>
      'This device could not be verified.';

  @override
  String get error_identity_device_key_invalid =>
      'This device key is not valid.';

  @override
  String get error_identity_mfa_recovery_not_ready =>
      'Recovery is not available yet. Try again when the wait ends.';

  @override
  String get error_identity_mfa_factor_already_enrolled =>
      'That verification method is already active.';

  @override
  String get error_identity_mfa_factor_not_enrolled =>
      'That verification method is not active.';

  @override
  String get error_identity_passkey_verification_failed =>
      'The passkey could not be verified.';

  @override
  String get error_identity_passkey_challenge_expired =>
      'The passkey check expired. Try again.';

  @override
  String get error_identity_tenant_slug_taken =>
      'That identifier is already in use. Choose another one.';

  @override
  String get error_identity_tenant_not_member =>
      'You are not a member of that organization.';

  @override
  String get error_identity_access_last_owner =>
      'The organization must keep at least one owner.';

  @override
  String get error_identity_access_system_role_immutable =>
      'System roles cannot be changed or deleted.';

  @override
  String get error_identity_access_name_taken =>
      'A group or role with that name already exists.';

  @override
  String get error_identity_invitation_invalid =>
      'The invitation is invalid, expired or already used.';

  @override
  String get error_identity_invitation_email_mismatch =>
      'The verified email of your account does not match the invitation.';

  @override
  String get error_identity_api_key_invalid => 'The API key is not valid.';

  @override
  String get error_identity_api_key_expired => 'The API key expired.';

  @override
  String get error_identity_api_key_ip_not_allowed =>
      'The API key cannot be used from this IP address.';

  @override
  String get error_identity_api_key_permission_not_grantable =>
      'You cannot grant permissions your account does not have.';

  @override
  String get error_identity_service_account_disabled =>
      'The service account is disabled.';

  @override
  String get error_platform_access_feature_not_included =>
      'Your plan does not include this feature.';

  @override
  String get error_platform_access_flag_disabled =>
      'This feature is not available to you yet.';

  @override
  String get error_tasks_task_not_found => 'We could not find that task.';

  @override
  String get error_tasks_task_version_conflict =>
      'The task changed while you were editing it. Reload it.';

  @override
  String get error_tasks_search_query_too_short =>
      'Type at least two characters to search.';

  @override
  String get error_notifications_inbox_not_found =>
      'We could not find that notification.';

  @override
  String get error_notifications_preferences_invalid_quiet_hours =>
      'Check the quiet hours: use 24-hour times and choose your time zone.';

  @override
  String get error_notifications_realtime_unauthenticated =>
      'The live connection could not be opened. Sign in again.';

  @override
  String get error_reports_run_not_found =>
      'We could not find that report run.';

  @override
  String get error_reports_run_not_ready =>
      'The report is still being generated. Wait a moment.';

  @override
  String get error_reports_run_expired =>
      'This report expired. Generate a new one.';

  @override
  String get error_reports_type_unknown => 'That report does not exist.';

  @override
  String get error_reports_params_invalid_range =>
      'Check the dates: the end must be after the start and the range cannot be too long.';

  @override
  String get error_reports_result_too_large =>
      'The report is too large. Narrow the date range.';

  @override
  String get error_billing_subscription_not_found =>
      'Your organization does not have a subscription yet.';

  @override
  String get error_billing_subscription_not_changeable =>
      'You cannot change plans while the subscription is suspended or canceled.';

  @override
  String get error_billing_plan_not_available => 'That plan is not available.';

  @override
  String get error_billing_plan_usage_exceeds_limit =>
      'Your current usage exceeds the limits of that plan. Reduce usage or pick another plan.';

  @override
  String get error_billing_invoice_not_found =>
      'We could not find that invoice.';

  @override
  String get error_billing_invoice_invalid_state =>
      'That invoice does not allow this operation in its current state.';

  @override
  String get error_billing_invoice_amount_mismatch =>
      'The amount paid does not match the total of the invoice.';

  @override
  String get error_billing_quota_exceeded =>
      'You reached your plan limit. Change plans to continue.';

  @override
  String get errorFallback => 'Something went wrong. Try again.';
}
