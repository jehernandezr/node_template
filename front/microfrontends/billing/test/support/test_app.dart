import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_billing/src/l10n/generated/billing_localizations.dart';

/// Wraps [home] in a MaterialApp with the shell's and the billing copy, as the
/// shell and the deferred page do at runtime.
Widget testApp(Widget home, {Locale locale = const Locale('es')}) {
  return MaterialApp(
    locale: locale,
    supportedLocales: const [Locale('es'), Locale('en')],
    localizationsDelegates: [
      ...GlobalMaterialLocalizations.delegates,
      AppLocalizations.delegate,
      BillingLocalizations.delegate,
    ],
    home: home,
  );
}
