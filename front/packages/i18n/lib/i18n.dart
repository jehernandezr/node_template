/// Localized texts for the front: the ARB messages and the platform error messages.
library;

import 'package:flutter/widgets.dart';

import 'src/generated/app_localizations.dart';

export 'src/generated/app_localizations.dart';

/// Locales the app supports, Spanish first (the template locale).
const List<Locale> supportedLocales = AppLocalizations.supportedLocales;

/// Returns the message for a platform error [code], such as `PLATFORM.AUTH.FORBIDDEN`.
///
/// Unknown codes return the generic `errorFallback` message.
String errorMessage(AppLocalizations l10n, String code) {
  return switch (code) {
    'PLATFORM.VALIDATION.INVALID_INPUT' =>
      l10n.error_platform_validation_invalid_input,
    'PLATFORM.VALIDATION.REQUIRED' => l10n.error_platform_validation_required,
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
    _ => l10n.errorFallback,
  };
}

/// Returns the navigation label for a menu [labelKey], such as `menuAccount`.
///
/// Unknown keys return the key itself, so a missing label stays visible in the UI.
String menuLabel(AppLocalizations l10n, String labelKey) {
  return switch (labelKey) {
    'menuAccount' => l10n.menuAccount,
    'menuTasks' => l10n.menuTasks,
    'menuNotifications' => l10n.menuNotifications,
    'menuAssistant' => l10n.menuAssistant,
    'menuBilling' => l10n.menuBilling,
    'menuBackoffice' => l10n.menuBackoffice,
    'menuVerifier' => l10n.menuVerifier,
    _ => labelKey,
  };
}
