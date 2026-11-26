import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import '../data/backoffice_repository.dart';
import '../l10n/generated/backoffice_localizations.dart';
import '../shared/constants/backoffice_access.dart';
import '../shared/constants/backoffice_paths.dart';
import '../shared/types/backoffice_types.dart';
import 'async_sliver.dart';
import 'backoffice_page.dart';
import 'overview_controller.dart';

/// Overview cards: tenants, sagas needing intervention and dead-letter messages.
///
/// The saga and dead-letter cards appear only for the roles that can open them.
class OverviewScreen extends StatelessWidget {
  /// Overview of the backoffice backed by [repository].
  const OverviewScreen({super.key, required this.repository});

  /// Data source of the screen.
  final BackofficeRepository repository;

  @override
  Widget build(BuildContext context) => ControllerBuilder<OverviewController>(
    create: (_) => OverviewController(repository)..start(),
    builder: (context, controller) {
      final l10n = BackofficeLocalizations.of(context);
      final canReadOperations = context.can(backofficeOperationsReadAccess);
      return BackofficePage(
        title: l10n.overviewTitle,
        subtitle: l10n.overviewSubtitle,
        slivers: [
          AsyncSliver<BackofficeOverview>(
            value: controller.overview,
            onRetry: controller.start,
            data: (overview) => [
              SliverToBoxAdapter(
                child: Wrap(
                  spacing: AppSpacing.md,
                  runSpacing: AppSpacing.md,
                  children: [
                    _OverviewCard(
                      key: const Key('overview-tenants'),
                      label: l10n.cardTenants,
                      value: overview.tenantCount,
                      path: BackofficePaths.tenants,
                    ),
                    if (canReadOperations) ...[
                      _OverviewCard(
                        key: const Key('overview-sagas'),
                        label: l10n.cardSagas,
                        value: overview.sagasNeedingIntervention,
                        path: BackofficePaths.sagas,
                        highlight: overview.sagasNeedingIntervention > 0,
                      ),
                      _OverviewCard(
                        key: const Key('overview-dlq'),
                        label: l10n.cardDlq,
                        value: overview.deadLetterMessages,
                        path: BackofficePaths.dlq,
                        highlight: overview.deadLetterMessages > 0,
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ],
      );
    },
  );
}

class _OverviewCard extends StatelessWidget {
  const _OverviewCard({
    super.key,
    required this.label,
    required this.value,
    required this.path,
    this.highlight = false,
  });

  static const double _cardWidth = 300;

  final String label;
  final int value;
  final String path;

  /// Marks a count that needs a person; the warning icon carries it besides
  /// the color.
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final countColor = highlight ? scheme.error : scheme.primary;
    return AppCard(
      onTap: () => context.go(path),
      child: SizedBox(
        width: _cardWidth,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: textTheme.titleSmall),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                if (highlight) ...[
                  Icon(Icons.warning_amber_rounded, color: countColor),
                  const SizedBox(width: AppSpacing.xs),
                ],
                Text(
                  l10n.overviewCount(value),
                  style: textTheme.displaySmall?.copyWith(color: countColor),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              l10n.cardOpen,
              style: textTheme.labelMedium?.copyWith(color: scheme.primary),
            ),
          ],
        ),
      ),
    );
  }
}
