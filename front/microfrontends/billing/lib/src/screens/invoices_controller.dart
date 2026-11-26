import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/billing_repository.dart';
import '../shared/types/billing_types.dart';

/// State of the invoice list.
final class InvoicesController extends ChangeNotifier {
  /// Controller over [repository]; call `start` once.
  InvoicesController(BillingRepository repository)
    : _loader = AsyncLoader<List<InvoiceSummary>>(repository.invoices) {
    _loader.addListener(notifyListeners);
  }

  final AsyncLoader<List<InvoiceSummary>> _loader;

  /// Invoices, newest first: loading, loaded or failed.
  AsyncValue<List<InvoiceSummary>> get invoices => _loader.value;

  /// Loads the invoices. Calling it again reloads.
  Future<void> start() => _loader.load();

  @override
  void dispose() {
    _loader.dispose();
    super.dispose();
  }
}
