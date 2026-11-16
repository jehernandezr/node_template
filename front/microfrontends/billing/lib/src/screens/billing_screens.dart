/// Screens of the billing microfrontend. Imported as a deferred library by
/// `mf_billing.dart`, so the screens, their copy and the fake data load on the
/// first visit to `/billing`.
///
/// The builders below are what the manifest calls. They read the repository
/// from the microfrontend scope of the current identity and wrap the screen in
/// [BillingLocalizations], so the copy stays in this chunk.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import '../data/billing_data.dart';
import '../l10n/generated/billing_localizations.dart';
import 'billing_plan_screen.dart';
import 'invoice_detail_screen.dart';
import 'invoices_screen.dart';

/// Builds each billing screen for a [MicrofrontendScope]. The repository is
/// the scope's, so every identity has its own and releases it on close.
abstract final class BillingScreens {
  /// `/billing`.
  static Widget plan(MicrofrontendScope scope) => _withBillingTexts(
    BillingPlanScreen(repository: scope.repository(BillingData.repository)),
  );

  /// `/billing/invoices`.
  static Widget invoices(MicrofrontendScope scope) => _withBillingTexts(
    InvoicesScreen(repository: scope.repository(BillingData.repository)),
  );

  /// `/billing/invoices/:id`.
  static Widget invoice(MicrofrontendScope scope, String invoiceId) =>
      _withBillingTexts(
        InvoiceDetailScreen(
          repository: scope.repository(BillingData.repository),
          invoiceId: invoiceId,
        ),
      );

  /// The delegates load with the deferred screens, not with the shell.
  static Widget _withBillingTexts(Widget child) => DeferredLocalizations(
    delegates: const [BillingLocalizations.delegate],
    child: child,
  );
}
