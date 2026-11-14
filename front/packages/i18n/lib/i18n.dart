/// Localized texts for the front: the ARB messages and the platform error messages.
library;

import 'package:flutter/widgets.dart';

import 'src/generated/app_localizations.dart';
import 'src/generated/error_messages.dart';

export 'src/generated/app_localizations.dart';

/// Locales the app supports, Spanish first (the template locale).
const List<Locale> supportedLocales = AppLocalizations.supportedLocales;

/// Returns the message for a public error [code], such as `PLATFORM.AUTH.FORBIDDEN`.
///
/// Covers every public code of the generated contract catalogs; unknown codes
/// return the generic `errorFallback` message.
String errorMessage(AppLocalizations l10n, String code) =>
    errorMessageFor(l10n, code);

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
