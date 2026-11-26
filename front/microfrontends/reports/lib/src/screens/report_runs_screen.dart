import 'package:contracts/contracts.dart' show ReportRunSummary;
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';
import 'package:utils/utils.dart';

import '../data/reports_repository.dart';
import '../l10n/generated/reports_localizations.dart';
import '../l10n/report_labels.dart';
import '../shared/constants/reports_paths.dart';
import 'report_runs_controller.dart';
import 'widgets/run_status_label.dart';

/// Route `/reports/runs`: the runs of the tenant, newest first. It keeps
/// reading them while one is queued or running.
class ReportRunsScreen extends StatelessWidget {
  /// List of runs backed by [repository].
  const ReportRunsScreen({super.key, required this.repository});

  /// Source of the runs.
  final ReportsRepository repository;

  /// A deep link has nothing to pop: go to the catalog.
  @override
  Widget build(BuildContext context) => ControllerBuilder<ReportRunsController>(
    key: ObjectKey(repository),
    create: (_) => ReportRunsController(repository)..start(),
    builder: (context, controller) {
      final l10n = ReportsLocalizations.of(context);
      return AppPage(
        title: l10n.runsTitle,
        onBack: () => context.go(ReportsPaths.catalog),
        body: AsyncValueView<List<ReportRunSummary>>(
          value: controller.runs,
          errorMessage: l10n.loadError,
          onRetry: controller.start,
          data: (runs) => runs.isEmpty
              ? EmptyState(
                  icon: Icons.history,
                  title: l10n.emptyRunsTitle,
                  message: l10n.emptyRunsMessage,
                )
              : ContentColumn(
                  child: ListView.separated(
                    itemCount: runs.length,
                    separatorBuilder: (_, _) => const Divider(height: 1),
                    itemBuilder: (context, index) => _RunTile(run: runs[index]),
                  ),
                ),
        ),
      );
    },
  );
}

class _RunTile extends StatelessWidget {
  const _RunTile({required this.run});

  final ReportRunSummary run;

  @override
  Widget build(BuildContext context) {
    final l10n = ReportsLocalizations.of(context);
    return ListTile(
      key: ValueKey(run.id),
      title: Text(ReportLabels(l10n).type(run.type)),
      subtitle: Text(
        l10n.requestedAt(
          formatDateTime(run.createdAt.toLocal(), locale: context.localeTag),
        ),
      ),
      trailing: RunStatusLabel(status: run.status),
      onTap: () => context.go(ReportsPaths.run(run.id)),
    );
  }
}
