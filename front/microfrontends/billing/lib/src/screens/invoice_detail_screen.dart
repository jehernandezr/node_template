import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../billing_labels.dart';
import '../data/billing_models.dart';
import '../data/billing_repository.dart';
import '../format/money_format.dart';
import '../format/period_format.dart';
import '../l10n/generated/billing_localizations.dart';
import '../widgets/billing_colors.dart';
import '../widgets/status_chip.dart';

/// `/billing/invoices/:id`: invoice header, its charges and a download
/// placeholder.
class InvoiceDetailScreen extends StatefulWidget {
  /// Creates the detail for [invoiceId].
  const InvoiceDetailScreen({
    super.key,
    required this.repository,
    required this.invoiceId,
  });

  /// Source of the invoice.
  final BillingRepository repository;

  /// Identifier from the route.
  final String invoiceId;

  @override
  State<InvoiceDetailScreen> createState() => _InvoiceDetailScreenState();
}

class _InvoiceDetailScreenState extends State<InvoiceDetailScreen> {
  late Future<Invoice?> _future = widget.repository.invoice(widget.invoiceId);

  void _reload() => setState(
    () => _future = widget.repository.invoice(widget.invoiceId),
  );

  @override
  Widget build(BuildContext context) {
    final l10n = BillingLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.invoiceTitle)),
      body: FutureBuilder<Invoice?>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return ErrorView.fromException(
              snapshot.error!,
              fallbackMessage: l10n.loadError,
              codeLabel: AppLocalizations.of(context).errorCodeLabel,
              traceIdLabel: AppLocalizations.of(context).errorTraceIdLabel,
              retryLabel: AppLocalizations.of(context).actionRetry,
              onRetry: _reload,
            );
          }
          if (snapshot.connectionState != ConnectionState.done) {
            return const LoadingView();
          }
          final invoice = snapshot.data;
          if (invoice == null) {
            return EmptyState(
              icon: Icons.search_off,
              title: l10n.invoiceNotFound,
            );
          }
          return _InvoiceContent(invoice: invoice);
        },
      ),
    );
  }
}

class _InvoiceContent extends StatelessWidget {
  const _InvoiceContent({required this.invoice});

  final Invoice invoice;

  @override
  Widget build(BuildContext context) {
    final l10n = BillingLocalizations.of(context);
    final theme = Theme.of(context);
    return ListView(
      padding: const EdgeInsets.all(AppSpacing.md),
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      invoice.number,
                      style: theme.textTheme.headlineSmall,
                    ),
                  ),
                  StatusChip(
                    label: invoiceStatusLabel(l10n, invoice.status),
                    color: invoiceStatusColor(invoice.status),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                '${l10n.invoicePeriod}: ${formatPeriod(l10n, invoice.period)}',
                style: theme.textTheme.bodyMedium,
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        Text(l10n.charges, style: theme.textTheme.titleMedium),
        const SizedBox(height: AppSpacing.sm),
        AppCard(
          child: Column(
            children: [
              for (final line in invoice.lines)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(line.description),
                            Text(
                              invoiceLineKindLabel(l10n, line.kind),
                              style: theme.textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                      Text(formatMoney(line.amount)),
                    ],
                  ),
                ),
              const Divider(),
              Row(
                children: [
                  Expanded(
                    child: Text(l10n.total, style: theme.textTheme.titleSmall),
                  ),
                  Text(
                    formatMoney(invoice.total),
                    style: theme.textTheme.titleSmall,
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        AppButton(
          label: l10n.download,
          variant: AppButtonVariant.secondary,
          onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(l10n.downloadPending)),
          ),
        ),
      ],
    );
  }
}
