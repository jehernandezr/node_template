/// Screens of the assistant. This library is loaded on demand by the manifest,
/// so its strings and widgets stay out of the shell bundle.
library;

import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';

import '../data/assistant_data.dart';
import '../l10n/generated/assistant_localizations.dart';
import 'assistant_chat_screen.dart';
import 'assistant_list_screen.dart';

/// Builds each assistant screen for a [MicrofrontendScope]. The repository is
/// the scope's, so every identity has its own and the scope disposes it, which
/// cuts the answers in progress.
abstract final class AssistantScreens {
  /// Conversation list of the identity that owns [scope].
  static Widget list(MicrofrontendScope scope) => _withAssistantTexts(
    AssistantListScreen(repository: scope.repository(AssistantData.repository)),
  );

  /// Chat of [conversationId] for the identity that owns [scope].
  static Widget conversation(MicrofrontendScope scope, String conversationId) =>
      _withAssistantTexts(
        AssistantChatScreen(
          key: ValueKey(conversationId),
          conversationId: conversationId,
          repository: scope.repository(AssistantData.repository),
        ),
      );

  /// The delegates load with the deferred screens, not with the shell.
  static Widget _withAssistantTexts(Widget child) => DeferredLocalizations(
    delegates: const [AssistantLocalizations.delegate],
    child: child,
  );
}
