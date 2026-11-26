import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../../shared/types/assistant_types.dart';
import '../../shared/utils/assistant_paths.dart';

/// One conversation of the list. Tapping it opens the chat.
class ConversationTile extends StatelessWidget {
  /// Row of [conversation] in the list.
  const ConversationTile({super.key, required this.conversation});

  /// Conversation shown.
  final Conversation conversation;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final last = conversation.lastMessage;
    return AppCard(
      onTap: () => context.go(conversationPath(conversation.id)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(conversation.title, style: theme.textTheme.titleMedium),
          if (last != null) ...[
            const SizedBox(height: AppSpacing.xs),
            Text(
              last,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodyMedium,
            ),
          ],
        ],
      ),
    );
  }
}
