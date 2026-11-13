import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart' show formatMoney;

import '../l10n/billing_labels.dart';
import '../shared/types/billing_types.dart';
import '../data/billing_repository.dart';
import '../l10n/generated/billing_localizations.dart';
import 'widgets/billing_colors.dart';
import 'widgets/status_chip.dart';

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
  AsyncValue<List<Invoice>> _state = const AsyncValue.loading();
  int _generation = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final generation = ++_generation;
    final result = await AsyncValue.guard(widget.repository.invoices);
    if (!mounted || generation != _generation) return;
    setState(() => _state = result);
  }

  void _reload() {
    setState(() => _state = const AsyncValue.loading());
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = BillingLocalizations.of(context);
    final appL10n = AppLocalizations.of(context);
    return AppPage(
      title: l10n.invoicesTitle,
      onBack: () => context.go('/billing'),
      body: AsyncValueView<List<Invoice>>(
        value: _state,
        errorMessage: l10n.loadError,
        codeLabel: appL10n.errorCodeLabel,
        traceIdLabel: appL10n.errorTraceIdLabel,
        retryLabel: appL10n.actionRetry,
        onRetry: _reload,
        data: (invoices) {
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
                  formatPeriod(
                    l10n,
                    invoice.period,
                    locale: localeTag(context),
                  ),
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                formatMoney(invoice.total, locale: localeTag(context)),
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
