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
  String get menuAccount => 'Account';

  @override
  String get menuTasks => 'Tasks';

  @override
  String get menuNotifications => 'Notifications';

  @override
  String get menuAssistant => 'Assistant';

  @override
  String get menuBilling => 'Billing';

  @override
  String get menuBackoffice => 'Administration';

  @override
  String get menuVerifier => 'Verifier';

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
  String get goHome => 'Go to home';

  @override
  String get loading => 'Loading';

  @override
  String get errorCodeLabel => 'Code';

  @override
  String get errorTraceIdLabel => 'Trace ID';

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
  String get errorFallback => 'Something went wrong. Try again.';
}
