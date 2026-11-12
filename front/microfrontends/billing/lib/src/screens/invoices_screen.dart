import 'package:go_router/go_router.dart';
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

/// `/billing/invoices`: list of invoices, newest first.
class InvoicesScreen extends StatefulWidget {
  /// Creates the list backed by [repository].
  const InvoicesScreen({super.key, required this.repository});

  /// Source of the invoices.
  final BillingRepository repository;

  @override
  State<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends State<InvoicesScreen> {
  late Future<List<Invoice>> _future = widget.repository.invoices();

  void _reload() => setState(() => _future = widget.repository.invoices());

  @override
  Widget build(BuildContext context) {
    final l10n = BillingLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.invoicesTitle)),
      body: FutureBuilder<List<Invoice>>(
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
          final invoices = snapshot.data;
          if (invoices == null) return const LoadingView();
          if (invoices.isEmpty) {
            return EmptyState(
              icon: Icons.receipt_long_outlined,
              title: l10n.noInvoicesTitle,
              message: l10n.noInvoicesMessage,
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.md),
            itemCount: invoices.length,
            separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (context, index) {
              final invoice = invoices[index];
              return _InvoiceTile(
                invoice: invoice,
                onTap: () => context.go('/billing/invoices/${invoice.id}'),
              );
            },
          );
        },
      ),
    );
  }
}

class _InvoiceTile extends StatelessWidget {
  const _InvoiceTile({required this.invoice, required this.onTap});

  final Invoice invoice;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = BillingLocalizations.of(context);
    final theme = Theme.of(context);
    return AppCard(
      onTap: onTap,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(invoice.number, style: theme.textTheme.titleSmall),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  formatPeriod(l10n, invoice.period),
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                formatMoney(invoice.total),
                style: theme.textTheme.titleSmall,
              ),
              const SizedBox(height: AppSpacing.sm),
              StatusChip(
                label: invoiceStatusLabel(l10n, invoice.status),
                color: invoiceStatusColor(invoice.status),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
