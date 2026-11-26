import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../../l10n/generated/assistant_localizations.dart';
import '../../shared/constants/assistant_layout.dart';
import '../../shared/enums/assistant_role.dart';
import '../../shared/types/assistant_types.dart';
import 'citations_view.dart';
import 'tool_confirmation_card.dart';

/// One message of the conversation: the user's as a bubble at the end, the
/// assistant's as a card with its tool confirmation, sources and usage.
class ChatBubble extends StatelessWidget {
  /// Bubble of [message].
  const ChatBubble({
    super.key,
    required this.message,
    required this.onToolDecision,
  });

  /// Message shown.
  final ChatMessage message;

  /// Called with true when the user confirms the tool and false when the user
  /// rejects it.
  final ValueChanged<bool> onToolDecision;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    if (message.role == AssistantRole.user) {
      return Align(
        alignment: AlignmentDirectional.centerEnd,
        child: Container(
          margin: const EdgeInsetsDirectional.only(
            bottom: AssistantLayout.messageGap,
          ),
          padding: const EdgeInsets.symmetric(
            horizontal: AssistantLayout.userBubbleHorizontal,
            vertical: AssistantLayout.userBubbleVertical,
          ),
          decoration: BoxDecoration(
            color: scheme.primaryContainer,
            borderRadius: BorderRadius.circular(AppRadius.lg),
          ),
          child: Text(
            message.text,
            style: TextStyle(color: scheme.onPrimaryContainer),
          ),
        ),
      );
    }
    return Align(
      alignment: AlignmentDirectional.centerStart,
      child: ConstrainedBox(
        constraints: const BoxConstraints(
          maxWidth: AssistantLayout.bubbleMaxWidth,
        ),
        child: Card(
          margin: const EdgeInsetsDirectional.only(
            bottom: AssistantLayout.messageGap,
          ),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: _parts(context),
            ),
          ),
        ),
      ),
    );
  }

  /// Every part after the first is separated from the one above it.
  List<Widget> _parts(BuildContext context) {
    final l10n = AssistantLocalizations.of(context);
    final theme = Theme.of(context);
    final small = theme.textTheme.labelSmall?.copyWith(
      color: theme.colorScheme.onSurfaceVariant,
    );
    final parts = <Widget>[];

    if (message.text.isNotEmpty) {
      parts.add(Text(message.text));
    } else if (message.isStreaming) {
      parts.add(Text(l10n.streaming, style: small));
    }
    if (message.wasStopped) {
      parts.add(Text(l10n.stopped, style: small));
    }

    final request = message.toolRequest;
    if (request != null) {
      parts.add(
        ToolConfirmationCard(
          request: request,
          approved: message.toolApproved,
          onDecision: onToolDecision,
        ),
      );
    }

    if (message.citations.isNotEmpty) {
      parts.add(CitationsView(citations: message.citations));
    }

    final usage = message.usage;
    if (usage != null && !message.isStreaming) {
      parts.add(Text(l10n.usage(usage.input, usage.output), style: small));
    }

    return [
      for (var index = 0; index < parts.length; index++)
        index == 0
            ? parts[index]
            : Padding(
                padding: const EdgeInsetsDirectional.only(top: AppSpacing.sm),
                child: parts[index],
              ),
    ];
  }
}
