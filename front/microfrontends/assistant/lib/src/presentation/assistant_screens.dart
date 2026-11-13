/// Screens of the assistant. This library is loaded on demand by the manifest,
/// so its strings and widgets stay out of the shell bundle.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import '../data/assistant_repository.dart';
import '../data/fake_assistant_repository.dart';
import '../l10n/generated/assistant_localizations.dart';
import 'assistant_chat_screen.dart';
import 'assistant_list_screen.dart';

/// Creates the repository of one identity. Called once per scope by `scope.get`.
AssistantRepository createAssistantRepository(ShellServices services) =>
    FakeAssistantRepository();

/// Conversation list of the identity that owns [scope].
Widget buildAssistantListScreen(MicrofrontendScope scope) =>
    _AssistantLocalized(
      child: AssistantListScreen(
        repository: scope.get<AssistantRepository>(createAssistantRepository),
      ),
    );

/// Chat of [conversationId] for the identity that owns [scope].
Widget buildConversationScreen(
  MicrofrontendScope scope,
  String conversationId,
) => _AssistantLocalized(
  child: AssistantChatScreen(
    key: ValueKey(conversationId),
    conversationId: conversationId,
    repository: scope.get<AssistantRepository>(createAssistantRepository),
  ),
);

/// Adds the assistant's strings under the screens, so they resolve even when the
/// app does not register this delegate itself.
final class _AssistantLocalized extends StatelessWidget {
  const _AssistantLocalized({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Localizations.override(
    context: context,
    delegates: [AssistantLocalizations.delegate],
    child: child,
  );
}
