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

import '../data/billing_repository.dart';
import '../data/fake_billing_repository.dart';
import '../l10n/generated/billing_localizations.dart';
import 'billing_plan_screen.dart';
import 'invoice_detail_screen.dart';
import 'invoices_screen.dart';

/// The repository of [scope]. Created once per identity; a plan change in one
/// identity is never visible in another.
BillingRepository billingRepositoryOf(MicrofrontendScope scope) =>
    scope.get<BillingRepository>(_createRepository);

BillingRepository _createRepository(ShellServices services) =>
    FakeBillingRepository();

/// `/billing`.
Widget buildBillingPlanPage(BuildContext context, MicrofrontendScope scope) =>
    _localized(
      context,
      BillingPlanScreen(repository: billingRepositoryOf(scope)),
    );

/// `/billing/invoices`.
Widget buildInvoicesPage(BuildContext context, MicrofrontendScope scope) =>
    _localized(context, InvoicesScreen(repository: billingRepositoryOf(scope)));

/// `/billing/invoices/:id`.
Widget buildInvoicePage(
  BuildContext context,
  MicrofrontendScope scope,
  String invoiceId,
) => _localized(
  context,
  InvoiceDetailScreen(
    repository: billingRepositoryOf(scope),
    invoiceId: invoiceId,
  ),
);

Widget _localized(BuildContext context, Widget child) => Localizations.override(
  context: context,
  delegates: const [BillingLocalizations.delegate],
  child: child,
);
