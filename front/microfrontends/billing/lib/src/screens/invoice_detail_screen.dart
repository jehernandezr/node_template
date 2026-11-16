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
import 'invoice_detail_controller.dart';
import 'widgets/status_chip.dart';

/// `/billing/invoices/:id`: invoice header, its charges and a download
/// placeholder.
class InvoiceDetailScreen extends StatelessWidget {
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
  Widget build(BuildContext context) =>
      ControllerBuilder<InvoiceDetailController>(
        create: (_) =>
            InvoiceDetailController(repository, invoiceId: invoiceId)..start(),
        builder: (context, controller) {
          final l10n = BillingLocalizations.of(context);
          return AppPage(
            title: l10n.invoiceTitle,
            onBack: () => context.go(BillingPaths.invoices),
            body: AsyncValueView<Invoice?>(
              value: controller.invoice,
              errorMessage: l10n.loadError,
              onRetry: controller.start,
              data: (invoice) {
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
        },
      );
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
                    tone: BillingTones.invoice(invoice.status),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                l10n.invoicePeriodLine(
                  formatPeriod(l10n, invoice.period, locale: context.localeTag),
                ),
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
                      Text(formatMoney(line.amount, locale: context.localeTag)),
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
                    formatMoney(invoice.total, locale: context.localeTag),
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
          onPressed: () =>
              ScaffoldMessenger.of(context)
                  .showSnackBar(SnackBar(content: Text(l10n.downloadPending))),
        ),
      ],
    );
  }
}
