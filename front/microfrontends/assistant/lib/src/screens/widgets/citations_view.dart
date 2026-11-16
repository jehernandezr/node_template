import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../../l10n/generated/assistant_localizations.dart';
import '../../shared/types/assistant_types.dart';

/// Sources an answer was built from, one chip per citation.
class CitationsView extends StatelessWidget {
  const CitationsView({super.key, required this.citations});

  final List<Citation> citations;

  @override
  Widget build(BuildContext context) {
    final l10n = AssistantLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(l10n.sources, style: Theme.of(context).textTheme.labelMedium),
        const SizedBox(height: AppSpacing.xs),
        Wrap(
          spacing: AppSpacing.sm,
          runSpacing: AppSpacing.xs,
          children: [
            for (final citation in citations)
              Tooltip(
                message: citation.sourceId,
                child: Chip(
                  avatar: const Icon(
                    Icons.description_outlined,
                    size: AppIconSize.sm,
                  ),
                  label: Text(citation.title),
                ),
              ),
          ],
        ),
      ],
    );
  }
}
