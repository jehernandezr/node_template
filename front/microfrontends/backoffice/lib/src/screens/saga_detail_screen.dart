import 'package:contracts/contracts.dart';
import 'package:i18n/i18n.dart' show AppLocalizations;
import 'package:material_ui/material_ui.dart';
// TODO(WP0): migrar al showActionError de ui (ADR 0018) y quitar este hide.
import 'package:ui/ui.dart' hide showActionError;

import '../data/backoffice_models.dart';
import '../data/backoffice_repository.dart';
import '../l10n/generated/backoffice_localizations.dart';
import '../labels.dart';
import 'backoffice_page.dart';

/// Saga detail: step timeline, manual actions (each with a reason) and audit.
class SagaDetailScreen extends StatefulWidget {
  const SagaDetailScreen({
    super.key,
    required this.sagaId,
    required this.repository,
  });

  final String sagaId;

  /// Data source of the screen.
  final BackofficeRepository repository;

  @override
  State<SagaDetailScreen> createState() => _SagaDetailScreenState();
}

typedef _SagaData = ({Saga? saga, List<AuditEntry> audit});

class _SagaDetailScreenState extends State<SagaDetailScreen> {
  late Future<_SagaData> _data = _load();

  Future<_SagaData> _load() async {
    final saga = await widget.repository.saga(widget.sagaId);
    final audit = await widget.repository.sagaAudit(widget.sagaId);
    return (saga: saga, audit: audit);
  }

  Future<void> _runAction(SagaManualAction action) async {
    final reason = await showDialog<String>(
      context: context,
      builder: (_) => _ReasonDialog(action: action),
    );
    if (reason == null || !mounted) return;
    try {
      await widget.repository.applySagaAction(
        sagaId: widget.sagaId,
        action: action,
        reason: reason,
      );
    } on ApiErrorException catch (error) {
      if (mounted) showActionError(context, error);
      return;
    }
    if (!mounted) return;
    setState(() {
      _data = _load();
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(BackofficeLocalizations.of(context).sagaActionDone),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    return BackofficePage(
      title: l10n.sagaDetailTitle,
      backPath: '/backoffice/sagas',
      child: AsyncBody<_SagaData>(
        future: _data,
        builder: (context, data) {
          final saga = data.saga;
          if (saga == null) {
            return EmptyState(
              icon: Icons.account_tree_outlined,
              title: l10n.notFound,
            );
          }
          final theme = Theme.of(context);
          final scheme = theme.colorScheme;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(saga.id, style: theme.textTheme.titleLarge),
                    const SizedBox(height: AppSpacing.xs),
                    Chip(
                      label: Text(sagaStatusLabel(l10n, saga.status)),
                      backgroundColor: saga.needsIntervention
                          ? scheme.errorContainer
                          : null,
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    Text('${l10n.sagaType}: ${saga.type}'),
                    Text('${l10n.sagaTenant}: ${saga.tenantId}'),
                    Text(
                      '${l10n.sagaCurrentStep}: ${saga.currentOperation ?? '-'}',
                    ),
                    Text(
                      '${l10n.sagaUpdated}: ${formatTimestamp(saga.updatedAt)}',
                    ),
                    SelectableText(
                      '${l10n.traceId}: ${saga.traceId}',
                      style: theme.textTheme.labelSmall,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(l10n.sagaSteps, style: theme.textTheme.titleMedium),
              const SizedBox(height: AppSpacing.sm),
              if (saga.steps.isEmpty)
                EmptyState(icon: Icons.timeline, title: l10n.sagaStepsEmpty)
              else
                for (final step in saga.steps) _StepTile(step: step),
              const SizedBox(height: AppSpacing.lg),
              Text(l10n.sagaManualActions, style: theme.textTheme.titleMedium),
              const SizedBox(height: AppSpacing.sm),
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  for (final action in SagaManualAction.values)
                    OutlinedButton(
                      key: Key('saga-action-${action.name}'),
                      onPressed: () => _runAction(action),
                      child: Text(manualActionLabel(l10n, action)),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              Text(l10n.auditTitle, style: theme.textTheme.titleMedium),
              const SizedBox(height: AppSpacing.sm),
              AuditTimeline(entries: data.audit),
            ],
          );
        },
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
    final theme = Theme.of(context);
    final failed = step.status == SagaStepStatus.failed;
    final code = step.errorCode;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              l10n.sagaStepLabel(step.order, step.operation),
              style: theme.textTheme.titleSmall,
            ),
            Text(
              '${sagaDirectionLabel(l10n, step.direction)} · '
              '${stepStatusLabel(l10n, step.status)}',
              style: theme.textTheme.bodySmall?.copyWith(
                color: failed ? theme.colorScheme.error : null,
              ),
            ),
            if (code != null)
              Text(
                '${l10n.sagaErrorCode}: $code',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.error,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Asks for the reason of a manual action. Confirm stays disabled while blank.
class _ReasonDialog extends StatefulWidget {
  const _ReasonDialog({required this.action});

  final SagaManualAction action;

  @override
  State<_ReasonDialog> createState() => _ReasonDialogState();
}

class _ReasonDialogState extends State<_ReasonDialog> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    final shared = AppLocalizations.of(context);
    final reason = _controller.text.trim();
    return AlertDialog(
      title: Text(manualActionLabel(l10n, widget.action)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l10n.reasonHelp),
          const SizedBox(height: AppSpacing.md),
          TextField(
            key: const Key('saga-reason-field'),
            controller: _controller,
            autofocus: true,
            minLines: 2,
            maxLines: 4,
            decoration: InputDecoration(labelText: l10n.reasonLabel),
            onChanged: (_) => setState(() {}),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(shared.actionCancel),
        ),
        FilledButton(
          key: const Key('saga-reason-confirm'),
          onPressed: reason.isEmpty
              ? null
              : () => Navigator.of(context).pop(reason),
          child: Text(shared.confirm),
        ),
      ],
    );
  }
}
