import 'package:contracts/contracts.dart' show ReportRunStatus;
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../../l10n/generated/reports_localizations.dart';
import '../../l10n/report_labels.dart';
import '../../shared/enums/reports_enums.dart';
import '../../shared/types/run_progress_of.dart';

/// Status of a run as an icon and its text, colored by how it ended.
class RunStatusLabel extends StatelessWidget {
  const RunStatusLabel({super.key, required this.status});

  final ReportRunStatus status;

  @override
  Widget build(BuildContext context) {
    final colors = context.statusColors;
    final (icon, color) = switch (status.progress) {
      RunProgress.pending => (Icons.hourglass_top, colors.info),
      RunProgress.ready => (Icons.check_circle_outline, colors.success),
      RunProgress.ended => (
        Icons.error_outline,
        Theme.of(context).colorScheme.error,
      ),
    };
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: AppSpacing.xs),
        Text(
          ReportLabels(ReportsLocalizations.of(context)).status(status),
          style: Theme.of(context).textTheme.labelLarge,
        ),
      ],
    );
  }
}
