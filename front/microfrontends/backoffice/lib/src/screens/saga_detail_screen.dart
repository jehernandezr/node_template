import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart' show formatDateTime;

import '../data/backoffice_repository.dart';
import '../l10n/backoffice_labels.dart';
import '../l10n/generated/backoffice_localizations.dart';
import '../shared/constants/backoffice_access.dart';
import '../shared/enums/backoffice_enums.dart';
import '../shared/types/backoffice_types.dart';
import 'async_sliver.dart';
import 'audit_timeline.dart';
import 'backoffice_page.dart';
import 'saga_detail_controller.dart';
import 'saga_reason_dialog.dart';
import 'sliver_gap.dart';

/// Saga detail: step timeline, manual actions (each with a reason) and audit.
///
/// The manual actions appear only for `superAdmin` and `support`.
class SagaDetailScreen extends StatelessWidget {
  /// Detail of one saga with its steps, audit and manual actions.
  const SagaDetailScreen({
    super.key,
    required this.repository,
    required this.sagaId,
  });

  /// Data source of the screen.
  final BackofficeRepository repository;

  /// Id of the saga shown.
  final String sagaId;

  @override
  Widget build(BuildContext context) => ControllerBuilder<SagaDetailController>(
    key: ValueKey((repository, sagaId)),
    create: (_) => SagaDetailController(repository, sagaId: sagaId)..start(),
    builder: (context, controller) {
      final l10n = BackofficeLocalizations.of(context);
      return BackofficePage(
        title: l10n.sagaDetailTitle,
        slivers: [
          AsyncSliver<SagaWithAudit>(
            value: controller.detail,
            onRetry: controller.start,
            data: (data) => [
              _SagaDetailSlivers(data: data, controller: controller),
            ],
          ),
        ],
      );
    },
  );
}

class _SagaDetailSlivers extends StatelessWidget {
  const _SagaDetailSlivers({required this.data, required this.controller});

  final SagaWithAudit data;
  final SagaDetailController controller;

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    final saga = data.saga;
    if (saga == null) {
      return SliverToBoxAdapter(
        child: EmptyState(
          icon: Icons.account_tree_outlined,
          title: l10n.notFound,
        ),
      );
    }
    return SliverMainAxisGroup(
      slivers: [
        SliverToBoxAdapter(child: _SagaSummary(saga: saga)),
        const SliverGap(AppSpacing.lg),
        SliverToBoxAdapter(
          child: Semantics(
            header: true,
            child: Text(l10n.sagaSteps, style: textTheme.titleMedium),
          ),
        ),
        const SliverGap(AppSpacing.sm),
        if (saga.steps.isEmpty)
          SliverToBoxAdapter(
            child: EmptyState(icon: Icons.timeline, title: l10n.sagaStepsEmpty),
          )
        else
          SliverList.separated(
            itemCount: saga.steps.length,
            separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (context, index) => _StepTile(step: saga.steps[index]),
          ),
        SliverToBoxAdapter(
          child: AccessGate(
            rule: backofficeOperationsWriteAccess,
            child: _ManualActions(controller: controller),
          ),
        ),
        const SliverGap(AppSpacing.lg),
        SliverToBoxAdapter(
          child: Semantics(
            header: true,
            child: Text(l10n.auditTitle, style: textTheme.titleMedium),
          ),
        ),
        const SliverGap(AppSpacing.sm),
        AuditTimeline(entries: data.audit),
      ],
    );
  }
}

class _SagaSummary extends StatelessWidget {
  const _SagaSummary({required this.saga});

  final Saga saga;

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(saga.id, style: textTheme.titleLarge),
          const SizedBox(height: AppSpacing.xs),
          Chip(
            label: Text(sagaStatusLabel(l10n, saga.status)),
            backgroundColor: saga.needsIntervention
                ? scheme.errorContainer
                : null,
            labelStyle: saga.needsIntervention
                ? TextStyle(color: scheme.onErrorContainer)
                : null,
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(l10n.sagaTypeLine(saga.type)),
          Text(l10n.sagaTenantLine(saga.tenantId)),
          Text(
            l10n.sagaCurrentStepLine(saga.currentOperation ?? l10n.valueNone),
          ),
          Text(
            l10n.sagaUpdatedLine(
              formatDateTime(saga.updatedAt, locale: context.localeTag),
            ),
          ),
          SelectableText(
            l10n.traceIdLine(saga.traceId),
            style: textTheme.labelSmall,
          ),
        ],
      ),
    );
  }
}

class _StepTile extends StatelessWidget {
  const _StepTile({required this.step});

  final SagaStep step;

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final failed = step.status == SagaStepStatus.failed;
    final code = step.errorCode;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.sagaStepLabel(step.order, step.operation),
            style: textTheme.titleSmall,
          ),
          MetaLine(
            parts: [
              sagaDirectionLabel(l10n, step.direction),
              stepStatusLabel(l10n, step.status),
            ],
            style: textTheme.bodySmall?.copyWith(
              color: failed ? scheme.error : null,
            ),
          ),
          if (code != null)
            Text(
              l10n.sagaErrorCodeLine(code),
              style: textTheme.bodySmall?.copyWith(color: scheme.error),
            ),
        ],
      ),
    );
  }
}

class _ManualActions extends StatelessWidget {
  const _ManualActions({required this.controller});

  final SagaDetailController controller;

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    final textTheme = Theme.of(context).textTheme;
    return Column(
      key: const Key('saga-manual-actions'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: AppSpacing.lg),
        Semantics(
          header: true,
          child: Text(l10n.sagaManualActions, style: textTheme.titleMedium),
        ),
        const SizedBox(height: AppSpacing.sm),
        Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.sm,
          children: [
            for (final action in SagaManualAction.values)
              OutlinedButton(
                key: Key('saga-action-${action.name}'),
                onPressed: controller.isBusy
                    ? null
                    : () => _run(context, action),
                child: Text(manualActionLabel(l10n, action)),
              ),
          ],
        ),
      ],
    );
  }

  Future<void> _run(BuildContext context, SagaManualAction action) async {
    final reason = await context.showLocalizedDialog<String>(
      builder: (_) => SagaReasonDialog(action: action),
    );
    if (reason == null || !context.mounted) return;
    final result = await controller.apply(action, reason);
    if (!context.mounted) return;
    showActionResult(
      context,
      result,
      success: BackofficeLocalizations.of(context).sagaActionDone,
    );
  }
}
