import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/assistant_repository.dart';
import '../l10n/generated/assistant_localizations.dart';
import '../shared/types/assistant_types.dart';
import '../shared/utils/assistant_paths.dart';

/// Conversation list with a button to start a new one.
class AssistantListScreen extends StatefulWidget {
  const AssistantListScreen({super.key, required this.repository});

  final AssistantRepository repository;

  @override
  State<AssistantListScreen> createState() => _AssistantListScreenState();
}

class _AssistantListScreenState extends State<AssistantListScreen> {
  AsyncValue<List<Conversation>> _conversations = const AsyncValue.loading();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final result = await AsyncValue.guard(widget.repository.listConversations);
    if (!mounted) return;
    setState(() => _conversations = result);
  }

  void _retry() {
    setState(() => _conversations = const AsyncValue.loading());
    _load();
  }

  Future<void> _createConversation() async {
    final l10n = AssistantLocalizations.of(context);
    try {
      final conversation = await widget.repository.createConversation();
      if (!mounted) return;
      context.go(conversationPath(conversation.id));
    } on Exception catch (error) {
      // API, contract or network.
      if (!mounted) return;
      showActionError(context, error, message: l10n.createError);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AssistantLocalizations.of(context);
    final shared = AppLocalizations.of(context);
    return AppPage(
      title: l10n.title,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _createConversation,
        icon: const Icon(Icons.add),
        label: Text(l10n.newConversation),
      ),
      body: AsyncValueView<List<Conversation>>(
        value: _conversations,
        errorMessage: l10n.listError,
        onRetry: _retry,
        retryLabel: shared.actionRetry,
        codeLabel: shared.errorCodeLabel,
        traceIdLabel: shared.errorTraceIdLabel,
        data: (items) {
          if (items.isEmpty) {
            return EmptyState(
              icon: Icons.chat_bubble_outline,
              title: l10n.emptyConversations,
              actionLabel: l10n.newConversation,
              onAction: _createConversation,
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.md),
            itemCount: items.length,
            separatorBuilder: (context, index) =>
                const SizedBox(height: AppSpacing.sm),
            itemBuilder: (context, index) =>
                _ConversationTile(conversation: items[index]),
          );
        },
      ),
    );
  }
}

class _ConversationTile extends StatelessWidget {
  const _ConversationTile({required this.conversation});

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
