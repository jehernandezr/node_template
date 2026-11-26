import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/billing_repository.dart';
import '../shared/types/billing_types.dart';

/// State of one invoice.
final class InvoiceDetailController extends ChangeNotifier {
  /// Controller of one invoice over [repository].
  InvoiceDetailController(
    BillingRepository repository, {
    required String invoiceId,
  }) : _loader = AsyncLoader<Invoice?>(() => repository.invoice(invoiceId)) {
    _loader.addListener(notifyListeners);
  }

  final AsyncLoader<Invoice?> _loader;

  /// The invoice, or null inside the data when it does not exist.
  AsyncValue<Invoice?> get invoice => _loader.value;

  /// Loads the invoice. Calling it again reloads.
  Future<void> start() => _loader.load();

  @override
  void dispose() {
    _loader.dispose();
    super.dispose();
  }
}
