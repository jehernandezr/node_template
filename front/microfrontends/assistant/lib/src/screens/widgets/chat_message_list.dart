import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../../shared/constants/assistant_layout.dart';
import '../../shared/enums/assistant_role.dart';
import '../../shared/types/assistant_types.dart';
import 'chat_bubble.dart';

/// Scrollable history of the conversation. It follows the newest content only
/// while the user is already at the end, so reading older messages is never
/// interrupted.
class ChatMessageList extends StatefulWidget {
  const ChatMessageList({
    super.key,
    required this.messages,
    required this.onToolDecision,
  });

  final List<ChatMessage> messages;

  /// Called with the id of the message and the user's answer to its tool.
  final void Function(String messageId, bool approved) onToolDecision;

  @override
  State<ChatMessageList> createState() => _ChatMessageListState();
}

class _ChatMessageListState extends State<ChatMessageList> {
  final ScrollController _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _jumpToEnd());
  }

  @override
  void didUpdateWidget(ChatMessageList oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Read the position before the new items lay out, so the check reflects
    // where the user was.
    final wasAtEnd =
        !_scroll.hasClients ||
        _scroll.position.pixels >=
            _scroll.position.maxScrollExtent - AssistantLayout.followTolerance;
    // A send adds the user's message and the empty answer together, so the
    // user message may sit anywhere among the new items.
    final userSent = widget.messages
        .skip(oldWidget.messages.length)
        .any((message) => message.role == AssistantRole.user);
    if (wasAtEnd || userSent) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _jumpToEnd());
    }
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  void _jumpToEnd() {
    if (mounted && _scroll.hasClients) {
      _scroll.jumpTo(_scroll.position.maxScrollExtent);
      // The items that were just added are measured in the frame after the
      // jump, which can extend the list, so the jump is repeated until the
      // end stops moving.
      WidgetsBinding.instance.addPostFrameCallback((_) => _settleAtEnd());
    }
  }

  void _settleAtEnd() {
    if (!mounted || !_scroll.hasClients) return;
    if (_scroll.position.pixels < _scroll.position.maxScrollExtent) {
      _jumpToEnd();
    }
  }

  @override
  Widget build(BuildContext context) => ListView.builder(
    controller: _scroll,
    padding: const EdgeInsets.all(AppSpacing.md),
    itemCount: widget.messages.length,
    itemBuilder: (context, index) {
      final message = widget.messages[index];
      return ChatBubble(
        message: message,
        onToolDecision: (approved) =>
            widget.onToolDecision(message.id, approved),
      );
    },
  );
}
