import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/backoffice_repository.dart';
import '../l10n/backoffice_labels.dart';
import '../l10n/generated/backoffice_localizations.dart';
import '../shared/constants/backoffice_paths.dart';
import '../shared/enums/backoffice_enums.dart';
import '../shared/types/backoffice_types.dart';
import 'async_sliver.dart';
import 'backoffice_page.dart';
import 'enum_filter.dart';
import 'sagas_controller.dart';
import 'sliver_gap.dart';

/// Saga list with a status filter. Sagas that need a person are highlighted.
class SagasScreen extends StatelessWidget {
  /// Sagas screen backed by [repository].
  const SagasScreen({super.key, required this.repository});

  /// Data source of the screen.
  final BackofficeRepository repository;

  @override
  Widget build(BuildContext context) => ControllerBuilder<SagasController>(
    create: (_) => SagasController(repository)..start(),
    builder: (context, controller) {
      final l10n = BackofficeLocalizations.of(context);
      return BackofficePage(
        title: l10n.sagasTitle,
        slivers: [
          SliverToBoxAdapter(
            child: Align(
              alignment: AlignmentDirectional.centerStart,
              child: EnumFilter<SagaStatus>(
                key: const Key('saga-status-filter'),
                label: l10n.filterStatus,
                allLabel: l10n.filterStatusAll,
                values: SagaStatus.values,
                valueLabel: (status) => sagaStatusLabel(l10n, status),
                value: controller.status,
                onChanged: controller.filterByStatus,
              ),
            ),
          ),
          const SliverGap(AppSpacing.md),
          AsyncSliver<List<Saga>>(
            value: controller.sagas,
            onRetry: controller.start,
            data: (sagas) => sagas.isEmpty
                ? [
                    SliverToBoxAdapter(
                      child: EmptyState(
                        icon: Icons.account_tree_outlined,
                        title: l10n.sagasEmpty,
                      ),
                    ),
                  ]
                : [
                    SliverList.separated(
                      itemCount: sagas.length,
                      separatorBuilder: (_, _) =>
                          const SizedBox(height: AppSpacing.sm),
                      itemBuilder: (context, index) =>
                          _SagaTile(saga: sagas[index]),
                    ),
                  ],
          ),
        ],
      );
    },
  );
}

class _SagaTile extends StatelessWidget {
  const _SagaTile({required this.saga});

  final Saga saga;

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final highlight = saga.needsIntervention;
    final foreground = highlight ? scheme.onErrorContainer : scheme.onSurface;
    final radius = BorderRadius.circular(AppRadius.md);
    return Material(
      key: highlight
          ? ValueKey('saga-highlight-${saga.id}')
          : ValueKey('saga-${saga.id}'),
      color: highlight ? scheme.errorContainer : scheme.surfaceContainerHighest,
      borderRadius: radius,
      child: InkWell(
        borderRadius: radius,
        onTap: () => context.go(BackofficePaths.saga(saga.id)),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (highlight) ...[
                    Icon(Icons.warning_amber_rounded, color: foreground),
                    const SizedBox(width: AppSpacing.xs),
                  ],
                  Expanded(
                    child: MetaLine(
                      parts: [saga.type, saga.id],
                      style: textTheme.titleMedium?.copyWith(color: foreground),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xs),
              MetaLine(
                parts: [
                  sagaStatusLabel(l10n, saga.status),
                  saga.tenantId,
                  saga.currentOperation ?? l10n.valueNone,
                ],
                style: textTheme.bodySmall?.copyWith(color: foreground),
              ),
              if (highlight)
                Text(
                  l10n.sagaIntervention,
                  style: textTheme.labelLarge?.copyWith(color: foreground),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
