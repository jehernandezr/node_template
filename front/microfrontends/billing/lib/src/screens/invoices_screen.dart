import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart' show formatMoney;

import '../data/billing_repository.dart';
import '../l10n/billing_labels.dart';
import '../l10n/generated/billing_localizations.dart';
import '../shared/constants/billing_paths.dart';
import '../shared/types/billing_types.dart';
import '../shared/utils/billing_tones.dart';
import 'invoices_controller.dart';
import 'widgets/status_chip.dart';

/// `/billing/invoices`: list of invoices, newest first.
class InvoicesScreen extends StatelessWidget {
  /// Creates the list backed by [repository].
  const InvoicesScreen({super.key, required this.repository});

  /// Source of the invoices.
  final BillingRepository repository;

  @override
  Widget build(BuildContext context) => ControllerBuilder<InvoicesController>(
    create: (_) => InvoicesController(repository)..start(),
    builder: (context, controller) {
      final l10n = BillingLocalizations.of(context);
      return AppPage(
        title: l10n.invoicesTitle,
        onBack: () => context.go(BillingPaths.plan),
        body: AsyncValueView<List<Invoice>>(
          value: controller.invoices,
          errorMessage: l10n.loadError,
          onRetry: controller.start,
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
                  onTap: () => context.go(BillingPaths.invoice(invoice.id)),
                );
              },
            );
          },
        ),
      );
    },
  );
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
                  formatPeriod(l10n, invoice.period, locale: context.localeTag),
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                formatMoney(invoice.total, locale: context.localeTag),
                style: theme.textTheme.titleSmall,
              ),
              const SizedBox(height: AppSpacing.sm),
              StatusChip(
                label: invoiceStatusLabel(l10n, invoice.status),
                tone: BillingTones.invoice(invoice.status),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
