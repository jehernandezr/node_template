import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/assistant_repository.dart';
import '../l10n/generated/assistant_localizations.dart';
import '../shared/types/assistant_types.dart';
import '../shared/utils/assistant_paths.dart';
import 'assistant_list_controller.dart';
import 'widgets/conversation_tile.dart';

/// Conversation list with a button to start a new one.
class AssistantListScreen extends StatelessWidget {
  /// List of conversations backed by [repository].
  const AssistantListScreen({super.key, required this.repository});

  /// Source of the conversations.
  final AssistantRepository repository;

  @override
  Widget build(BuildContext context) =>
      ControllerBuilder<AssistantListController>(
        create: (context) => AssistantListController(repository)..start(),
        builder: (context, controller) {
          final l10n = AssistantLocalizations.of(context);
          return AppPage(
            title: l10n.title,
            floatingActionButton: FloatingActionButton.extended(
              onPressed: () => _create(context, controller),
              icon: const Icon(Icons.add),
              label: Text(l10n.newConversation),
            ),
            body: AsyncValueView<List<Conversation>>(
              value: controller.conversations,
              errorMessage: l10n.listError,
              onRetry: controller.start,
              data: (items) {
                if (items.isEmpty) {
                  return EmptyState(
                    icon: Icons.chat_bubble_outline,
                    title: l10n.emptyConversations,
                    actionLabel: l10n.newConversation,
                    onAction: () => _create(context, controller),
                  );
                }
                return ListView.separated(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  itemCount: items.length,
                  separatorBuilder: (_, _) =>
                      const SizedBox(height: AppSpacing.sm),
                  itemBuilder: (_, index) =>
                      ConversationTile(conversation: items[index]),
                );
              },
            ),
          );
        },
      );

  static Future<void> _create(
    BuildContext context,
    AssistantListController controller,
  ) async {
    final result = await controller.create();
    if (!context.mounted) return;
    switch (result) {
      case ActionSucceeded<Conversation>(:final value):
        context.go(conversationPath(value.id));
      case ActionFailed<Conversation>() || ActionSkipped<Conversation>():
        showActionResult(
          context,
          result,
          failure: AssistantLocalizations.of(context).createError,
        );
    }
  }
}
