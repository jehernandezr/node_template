import 'package:contracts/contracts.dart' show ReportRunDetail, ReportRunStatus;
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/report_file_saver.dart';
import '../data/reports_repository.dart';
import '../l10n/generated/reports_localizations.dart';
import '../l10n/report_labels.dart';
import '../shared/constants/reports_paths.dart';
import '../shared/enums/reports_enums.dart';
import '../shared/types/report_run_not_found_exception.dart';
import '../shared/types/saved_report.dart';
import 'report_run_controller.dart';
import 'widgets/report_result_table.dart';
import 'widgets/run_status_label.dart';

/// Route `/reports/runs/:runId`: one run, read again while it is queued or
/// running, with its result and its download once it is ready.
class ReportRunScreen extends StatelessWidget {
  const ReportRunScreen({
    super.key,
    required this.repository,
    required this.saver,
    required this.runId,
  });

  final ReportsRepository repository;
  final ReportFileSaver saver;
  final String runId;

  @override
  Widget build(BuildContext context) => ControllerBuilder<ReportRunController>(
    key: ValueKey((repository, runId)),
    create: (_) =>
        ReportRunController(repository, runId: runId, saver: saver)..start(),
    builder: (context, controller) {
      final l10n = ReportsLocalizations.of(context);
      final notFound = switch (controller.run) {
        AsyncError<ReportRunDetail>(:final error) =>
          error is ReportRunNotFoundException,
        _ => false,
      };
      return AppPage(
        title: l10n.runTitle,
        // A deep link has nothing to pop: go to the runs.
        onBack: () => context.go(ReportsPaths.runs),
        actions: [
          if (controller.canDownload || controller.isDownloading)
            IconButton(
              tooltip: l10n.download,
              icon: const Icon(Icons.download),
              onPressed: controller.canDownload
                  ? () => _download(context, controller)
                  : null,
            ),
        ],
        body: AsyncValueView<ReportRunDetail>(
          value: controller.run,
          errorMessage: notFound ? l10n.runNotFound : l10n.loadError,
          onRetry: notFound ? null : controller.start,
          data: (run) => _RunBody(run: run),
        ),
      );
    },
  );

  Future<void> _download(
    BuildContext context,
    ReportRunController controller,
  ) async {
    final l10n = ReportsLocalizations.of(context);
    final result = await controller.download();
    if (!context.mounted) return;
    showActionResult(
      context,
      result,
      success: switch (result) {
        ActionSucceeded<SavedReport>(:final value) => switch (value.outcome) {
          ReportSaveOutcome.downloaded => l10n.downloaded(value.fileName),
          ReportSaveOutcome.copied => l10n.copied(value.fileName),
        },
        _ => null,
      },
      failure: l10n.downloadError,
    );
  }
}

class _RunBody extends StatelessWidget {
  const _RunBody({required this.run});

  final ReportRunDetail run;

  @override
  Widget build(BuildContext context) {
    final l10n = ReportsLocalizations.of(context);
    final labels = ReportLabels(l10n);
    final theme = Theme.of(context);
    final notice = switch (run.status) {
      ReportRunStatus.queued || ReportRunStatus.running => l10n.runPending,
      ReportRunStatus.failed => l10n.runFailed,
      ReportRunStatus.expired => l10n.runExpired,
      ReportRunStatus.ready => null,
    };
    final result = run.result;
    return ContentColumn(
      child: ListView(
        padding: const EdgeInsetsDirectional.all(AppSpacing.md),
        children: [
          Text(labels.type(run.type), style: theme.textTheme.headlineSmall),
          const SizedBox(height: AppSpacing.sm),
          RunStatusLabel(status: run.status),
          const SizedBox(height: AppSpacing.sm),
          Text(
            l10n.runSummary(
              l10n.runRange(run.params.from, run.params.to),
              labels.granularity(run.params.granularity),
              labels.format(run.format),
            ),
            style: theme.textTheme.bodyMedium,
          ),
          if (notice != null) ...[
            const SizedBox(height: AppSpacing.md),
            Semantics(liveRegion: true, child: Text(notice)),
          ],
          if (result != null) ...[
            const SizedBox(height: AppSpacing.md),
            result.rows.isEmpty
                ? Text(l10n.noRows)
                : ReportResultTable(result: result),
          ],
        ],
      ),
    );
  }
}
