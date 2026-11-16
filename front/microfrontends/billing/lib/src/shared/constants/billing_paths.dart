import 'package:shell_core/shell_core.dart';

/// Id of the microfrontend and first segment of its routes.
const MicrofrontendId billingId = MicrofrontendId('billing');

/// Menu label. The shell draws it before the microfrontend loads, so it
/// travels with the manifest instead of the deferred ARB files.
const MenuLabel billingMenuLabel = MenuLabel({
  'es': 'Facturación',
  'en': 'Billing',
});

/// Routes of the billing microfrontend. The manifest and the screens build
/// every location from here.
abstract final class BillingPaths {
  /// The plan, root of the microfrontend.
  static const String plan = '/billing';

  /// Segment of the invoice list, child of [plan].
  static const String invoicesSegment = 'invoices';

  /// Name of the invoice id path parameter.
  static const String idParam = 'id';

  /// The invoice list.
  static const String invoices = '$plan/$invoicesSegment';

  /// Detail of the invoice [id].
  static String invoice(String id) => '$invoices/${Uri.encodeComponent(id)}';
}
