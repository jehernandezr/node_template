import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../../l10n/generated/reports_localizations.dart';
import '../../l10n/report_labels.dart';
import '../../shared/enums/reports_enums.dart';
import '../../shared/types/report_draft.dart';
import '../report_catalog_controller.dart';

/// The parameters of the prepared report: period, grouping and format.
class ReportDraftForm extends StatelessWidget {
  /// Form of [draft] that edits it through [controller].
  const ReportDraftForm({
    super.key,
    required this.draft,
    required this.controller,
  });

  /// Draft shown.
  final ReportDraft draft;

  /// Controller that changes the draft.
  final ReportCatalogController controller;

  @override
  Widget build(BuildContext context) {
    final l10n = ReportsLocalizations.of(context);
    final labels = ReportLabels(l10n);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          labels.type(draft.entry.type),
          style: Theme.of(context).textTheme.titleLarge,
        ),
        _Choice(
          label: l10n.periodLabel,
          values: ReportPeriod.values,
          selected: draft.period,
          text: labels.period,
          onChanged: controller.choosePeriod,
        ),
        _Choice(
          label: l10n.granularityLabel,
          values: draft.entry.granularities,
          selected: draft.granularity,
          text: labels.granularity,
          onChanged: controller.chooseGranularity,
        ),
        _Choice(
          label: l10n.formatLabel,
          values: draft.entry.formats,
          selected: draft.format,
          text: labels.format,
          onChanged: controller.chooseFormat,
        ),
      ],
    );
  }
}

/// One parameter: its label and a segmented button with its values.
class _Choice<T extends Object> extends StatelessWidget {
  const _Choice({
    required this.label,
    required this.values,
    required this.selected,
    required this.text,
    required this.onChanged,
  });

  final String label;
  final List<T> values;
  final T selected;
  final String Function(T value) text;
  final void Function(T value) onChanged;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsetsDirectional.only(top: AppSpacing.md),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelLarge),
        const SizedBox(height: AppSpacing.sm),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: SegmentedButton<T>(
            segments: [
              for (final value in values)
                ButtonSegment<T>(value: value, label: Text(text(value))),
            ],
            selected: {selected},
            onSelectionChanged: (selection) => onChanged(selection.first),
          ),
        ),
      ],
    ),
  );
}
