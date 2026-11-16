import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../../l10n/generated/assistant_localizations.dart';

/// Text field and send button at the foot of the chat. While an answer
/// arrives the button stops it instead.
class ChatComposer extends StatefulWidget {
  const ChatComposer({
    super.key,
    required this.isStreaming,
    required this.onSend,
    required this.onStop,
  });

  final bool isStreaming;
  final ValueChanged<String> onSend;
  final VoidCallback onStop;

  @override
  State<ChatComposer> createState() => _ChatComposerState();
}

class _ChatComposerState extends State<ChatComposer> {
  final TextEditingController _input = TextEditingController();

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  void _send() {
    if (widget.isStreaming) return;
    final text = _input.text;
    _input.clear();
    widget.onSend(text);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AssistantLocalizations.of(context);
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _input,
              minLines: 1,
              maxLines: 4,
              textInputAction: TextInputAction.send,
              onSubmitted: (_) => _send(),
              decoration: InputDecoration(labelText: l10n.inputHint),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),
          if (widget.isStreaming)
            FilledButton(onPressed: widget.onStop, child: Text(l10n.stop))
          else
            FilledButton(onPressed: _send, child: Text(l10n.send)),
        ],
      ),
    );
  }
}
