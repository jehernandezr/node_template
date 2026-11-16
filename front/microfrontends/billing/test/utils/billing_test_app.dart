import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_billing/src/l10n/generated/billing_localizations.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

import 'billing_sessions.dart';

/// App with the shared texts and the billing texts installed around the
/// screen the way the deferred page installs them.
///
/// The billing delegates sit in a [DeferredLocalizations] around the screen
/// and not in the app, so a sheet opened without `showLocalizedSheet` misses
/// them here as it would in the shell.
final class BillingTestApp {
  /// The app. The session reads and changes billing unless [session] says
  /// otherwise.
  const BillingTestApp({this.session, this.locale = const Locale('es')});

  /// Session that `context.can` and `AccessGate` see. Null means
  /// [BillingSessions.writer].
  final UserSession? session;

  /// Locale of the app.
  final Locale locale;

  /// Billing texts in Spanish, to find widgets by their text.
  static BillingLocalizations get es =>
      lookupBillingLocalizations(const Locale('es'));

  /// Billing texts in English.
  static BillingLocalizations get en =>
      lookupBillingLocalizations(const Locale('en'));

  /// A `MaterialApp` whose home is [home] with the billing texts.
  Widget wrap(Widget home) => _app.wrap(_localized(home));

  /// An app that runs [router]. The billing texts come from the deferred
  /// pages of the manifest, as in the shell.
  Widget wrapRouter(GoRouter router) => _app.wrapRouter(router);

  /// Pumps [wrap] of [home] and lets the first frame settle with one `pump`.
  Future<void> pump(WidgetTester tester, Widget home) =>
      _app.pump(tester, _localized(home));

  TestApp get _app =>
      TestApp(locale: locale, session: session ?? BillingSessions.writer());

  static Widget _localized(Widget home) => DeferredLocalizations(
    delegates: const [BillingLocalizations.delegate],
    child: home,
  );
}
