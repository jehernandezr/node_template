import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/backoffice_models.dart';
import '../data/backoffice_repository.dart';
import '../l10n/generated/backoffice_localizations.dart';
import '../labels.dart';
import 'backoffice_page.dart';

/// Saga list with a status filter. Sagas that need a person are highlighted.
class SagasScreen extends StatefulWidget {
  const SagasScreen({super.key, required this.repository});

  /// Data source of the screen.
  final BackofficeRepository repository;

  @override
  State<SagasScreen> createState() => _SagasScreenState();
}

class _SagasScreenState extends State<SagasScreen> {
  SagaStatus? _status;
  late Future<List<Saga>> _sagas = widget.repository.listSagas(status: _status);

  void _onStatusChanged(SagaStatus? value) => setState(() {
    _status = value;
    _sagas = widget.repository.listSagas(status: _status);
  });

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    return BackofficePage(
      title: l10n.sagasTitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: DropdownButton<SagaStatus?>(
              key: const Key('saga-status-filter'),
              value: _status,
              items: [
                DropdownMenuItem<SagaStatus?>(
                  value: null,
                  child: Text('${l10n.filterStatus}: ${l10n.filterAll}'),
                ),
                for (final status in SagaStatus.values)
                  DropdownMenuItem<SagaStatus?>(
                    value: status,
                    child: Text(sagaStatusLabel(l10n, status)),
                  ),
              ],
              onChanged: _onStatusChanged,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          AsyncBody<List<Saga>>(
            future: _sagas,
            builder: (context, sagas) {
              if (sagas.isEmpty) {
                return EmptyState(
                  icon: Icons.account_tree_outlined,
                  title: l10n.sagasEmpty,
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final saga in sagas) _SagaTile(saga: saga),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
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
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Material(
        key: highlight ? ValueKey('saga-highlight-${saga.id}') : ValueKey('saga-${saga.id}'),
        color: highlight ? scheme.errorContainer : scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => context.go('/backoffice/sagas/${saga.id}'),
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
                      child: Text(
                        '${saga.type} · ${saga.id}',
                        style: textTheme.titleMedium?.copyWith(color: foreground),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  '${sagaStatusLabel(l10n, saga.status)} · ${saga.tenantId} · '
                  '${saga.currentOperation ?? '-'}',
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
      ),
    );
  }
}
