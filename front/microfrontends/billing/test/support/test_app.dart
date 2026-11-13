import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_billing/src/l10n/generated/billing_localizations.dart';
import 'package:shell_core/shell_core.dart';

/// Session that holds the billing permission.
UserSession billingSession() => UserSession(
  userId: 'u1',
  tenantId: 't1',
  permissions: {Permission.billingRead},
);

/// Session of a signed-in user without the billing permission.
UserSession noBillingSession() => UserSession(userId: 'u2', tenantId: 't1');

/// Wraps [home] in a MaterialApp with the shell's and the billing copy, as the
/// shell and the deferred page do at runtime, and in a [ShellAccessScope] with
/// [session] (the billing permission by default).
Widget testApp(
  Widget home, {
  Locale locale = const Locale('es'),
  UserSession? session,
}) {
  return ShellAccessScope(
    session: ValueNotifier<UserSession>(session ?? billingSession()),
    child: MaterialApp(
      locale: locale,
      supportedLocales: const [Locale('es'), Locale('en')],
      localizationsDelegates: [
        ...GlobalMaterialLocalizations.delegates,
        AppLocalizations.delegate,
        BillingLocalizations.delegate,
      ],
      home: home,
    ),
  );
}
