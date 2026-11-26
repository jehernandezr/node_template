import 'package:contracts/contracts.dart' show ReportCatalogEntry;
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import '../data/reports_repository.dart';
import '../l10n/generated/reports_localizations.dart';
import '../l10n/report_labels.dart';
import '../shared/constants/reports_access.dart';
import '../shared/constants/reports_paths.dart';
import 'report_catalog_controller.dart';
import 'widgets/report_draft_form.dart';

/// Route `/reports`: the reports of the tenant. Choosing one shows its
/// parameters, and generating it opens the new run.
class ReportCatalogScreen extends StatelessWidget {
  /// Report catalog backed by [repository].
  const ReportCatalogScreen({super.key, required this.repository});

  /// Source of the catalog.
  final ReportsRepository repository;

  /// The repository is part of the key: a new identity gets a new controller.
  @override
  Widget build(BuildContext context) =>
      ControllerBuilder<ReportCatalogController>(
        key: ObjectKey(repository),
        create: (_) => ReportCatalogController(repository)..start(),
        builder: (context, controller) {
          final l10n = ReportsLocalizations.of(context);
          return AppPage(
            title: l10n.catalogTitle,
            actions: [
              IconButton(
                tooltip: l10n.runsTitle,
                icon: const Icon(Icons.history),
                onPressed: () => context.go(ReportsPaths.runs),
              ),
            ],
            body: AsyncValueView<List<ReportCatalogEntry>>(
              value: controller.catalog,
              errorMessage: l10n.loadError,
              onRetry: controller.start,
              data: (entries) => entries.isEmpty
                  ? EmptyState(
                      icon: Icons.insert_chart_outlined,
                      title: l10n.emptyCatalogTitle,
                      message: l10n.emptyCatalogMessage,
                    )
                  : _Catalog(entries: entries, controller: controller),
            ),
          );
        },
      );
}

class _Catalog extends StatelessWidget {
  const _Catalog({required this.entries, required this.controller});

  final List<ReportCatalogEntry> entries;
  final ReportCatalogController controller;

  @override
  Widget build(BuildContext context) {
    final l10n = ReportsLocalizations.of(context);
    final labels = ReportLabels(l10n);
    final draft = controller.draft;
    return ContentColumn(
      child: ListView(
        padding: const EdgeInsetsDirectional.all(AppSpacing.md),
        children: [
          for (final entry in entries)
            ListTile(
              key: ValueKey(entry.type),
              leading: const Icon(Icons.insert_chart_outlined),
              title: Text(labels.type(entry.type)),
              selected: draft?.entry.type == entry.type,
              onTap: () => controller.choose(entry.type),
            ),
          const Divider(height: AppSpacing.lg),
          if (draft == null)
            Text(l10n.chooseReport)
          else ...[
            ReportDraftForm(draft: draft, controller: controller),
            const SizedBox(height: AppSpacing.md),
            AccessGate(
              rule: ReportsAccess.write,
              child: Align(
                alignment: AlignmentDirectional.centerEnd,
                child: FilledButton.icon(
                  icon: const Icon(Icons.play_arrow),
                  label: Text(l10n.generate),
                  onPressed: controller.isGenerating
                      ? null
                      : () => _generate(context),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _generate(BuildContext context) async {
    final failure = ReportsLocalizations.of(context).generateError;
    final result = await controller.generate();
    if (!context.mounted) return;
    if (result case ActionSucceeded<String>(:final value)) {
      context.go(ReportsPaths.run(value));
      return;
    }
    showActionResult(context, result, failure: failure);
  }
}
