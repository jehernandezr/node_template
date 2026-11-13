import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import '../data/backoffice_repository.dart';
import '../l10n/generated/backoffice_localizations.dart';
import '../shared/constants/backoffice_access.dart';
import '../shared/constants/backoffice_paths.dart';
import '../shared/types/backoffice_types.dart';
import 'widgets.dart';

/// Overview cards: tenants, sagas needing intervention and dead-letter messages.
///
/// The saga and dead-letter cards appear only for the roles that can open them.
class OverviewScreen extends StatefulWidget {
  const OverviewScreen({super.key, required this.repository});

  /// Data source of the screen.
  final BackofficeRepository repository;

  @override
  State<OverviewScreen> createState() => _OverviewScreenState();
}

class _OverviewScreenState extends State<OverviewScreen> {
  late Future<BackofficeOverview> _overview = widget.repository.overview();

  void _reload() => setState(() {
    _overview = widget.repository.overview();
  });

  @override
  Widget build(BuildContext context) {
    final l10n = BackofficeLocalizations.of(context);
    final operations = context.can(backofficeOperationsReadAccess);
    return BackofficePage(
      title: l10n.overviewTitle,
      subtitle: l10n.overviewSubtitle,
      child: AsyncBody<BackofficeOverview>(
        future: _overview,
        onRetry: _reload,
        builder: (context, overview) => Wrap(
          spacing: AppSpacing.md,
          runSpacing: AppSpacing.md,
          children: [
            _OverviewCard(
              valueKey: const Key('overview-tenants'),
              label: l10n.cardTenants,
              value: overview.tenantCount,
              path: BackofficePaths.tenants,
            ),
            if (operations)
              _OverviewCard(
                valueKey: const Key('overview-sagas'),
                label: l10n.cardSagas,
                value: overview.sagasNeedingIntervention,
                path: BackofficePaths.sagas,
                highlight: overview.sagasNeedingIntervention > 0,
              ),
            if (operations)
              _OverviewCard(
                valueKey: const Key('overview-dlq'),
                label: l10n.cardDlq,
                value: overview.deadLetterMessages,
                path: BackofficePaths.dlq,
                highlight: overview.deadLetterMessages > 0,
              ),
          ],
        ),
      ),
    );
  }
}

class _OverviewCard extends StatelessWidget {
  const _OverviewCard({
    required this.valueKey,
    required this.label,
    required this.value,
    required this.path,
    this.highlight = false,
  });

  final Key valueKey;
  final String label;
  final int value;
  final String path;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final color = highlight ? scheme.error : scheme.primary;
    return SizedBox(
      width: 300,
      child: AppCard(
        onTap: () => context.go(path),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: textTheme.titleSmall),
            const SizedBox(height: AppSpacing.sm),
            Text(
              '$value',
              key: valueKey,
              style: textTheme.displaySmall?.copyWith(color: color),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              BackofficeLocalizations.of(context).cardOpen,
              style: textTheme.labelMedium?.copyWith(color: scheme.primary),
            ),
          ],
        ),
      ),
    );
  }
}
