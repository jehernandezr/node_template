import 'package:go_router/go_router.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/assistant_models.dart';
import '../data/assistant_repository.dart';
import '../l10n/generated/assistant_localizations.dart';

/// Conversation list with a button to start a new one.
class AssistantListScreen extends StatefulWidget {
  const AssistantListScreen({super.key, required this.repository});

  final AssistantRepository repository;

  @override
  State<AssistantListScreen> createState() => _AssistantListScreenState();
}

class _AssistantListScreenState extends State<AssistantListScreen> {
  late Future<List<Conversation>> _conversations = widget.repository.listConversations();

  Future<void> _createConversation() async {
    final conversation = await widget.repository.createConversation();
    if (!mounted) return;
    context.go('/assistant/${conversation.id}');
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AssistantLocalizations.of(context);
    final shared = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.title)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _createConversation,
        icon: const Icon(Icons.add),
        label: Text(l10n.newConversation),
      ),
      body: FutureBuilder<List<Conversation>>(
        future: _conversations,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return ErrorView(
              message: l10n.listError,
              retryLabel: shared.actionRetry,
              codeLabel: shared.errorCodeLabel,
              traceIdLabel: shared.errorTraceIdLabel,
              onRetry: () => setState(() {
                _conversations = widget.repository.listConversations();
              }),
            );
          }
          if (!snapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final items = snapshot.requireData;
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
            separatorBuilder: (context, index) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (context, index) => _ConversationTile(conversation: items[index]),
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
      onTap: () => context.go('/assistant/${conversation.id}'),
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
