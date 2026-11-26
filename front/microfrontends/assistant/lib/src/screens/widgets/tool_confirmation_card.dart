import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import '../../l10n/generated/assistant_localizations.dart';
import '../../shared/constants/assistant_access.dart';
import '../../shared/types/assistant_types.dart';

/// Asks the user to confirm or cancel a tool the assistant wants to run. The
/// confirm button needs the permission the tool writes with; without it the
/// user can only cancel.
class ToolConfirmationCard extends StatelessWidget {
  /// Card that asks the user to confirm or reject [request].
  const ToolConfirmationCard({
    super.key,
    required this.request,
    required this.approved,
    required this.onDecision,
  });

  /// Tool call to confirm.
  final ToolConfirmationRequest request;

  /// Null while the request waits for the user, then the answer given.
  final bool? approved;

  /// Called with true when confirmed and false when cancelled.
  final ValueChanged<bool> onDecision;

  @override
  Widget build(BuildContext context) {
    final l10n = AssistantLocalizations.of(context);
    final theme = Theme.of(context);
    final answer = approved;
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: theme.colorScheme.outline),
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(l10n.toolRequestTitle, style: theme.textTheme.titleSmall),
            const SizedBox(height: AppSpacing.xs),
            Text(request.summary),
            const SizedBox(height: AppSpacing.xs),
            Text(
              request.toolName,
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            if (answer == null)
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                    onPressed: () => onDecision(false),
                    child: Text(l10n.toolCancel),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  AccessGate(
                    rule: AssistantAccess.tools,
                    child: FilledButton(
                      onPressed: () => onDecision(true),
                      child: Text(l10n.toolConfirm),
                    ),
                  ),
                ],
              )
            else
              Text(
                answer ? l10n.toolConfirmed : l10n.toolRejected,
                style: theme.textTheme.labelLarge,
              ),
          ],
        ),
      ),
    );
  }
}
