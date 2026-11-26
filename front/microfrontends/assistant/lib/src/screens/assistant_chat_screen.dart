import 'dart:async';

import 'package:flutter/semantics.dart';
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/assistant_repository.dart';
import '../l10n/generated/assistant_localizations.dart';
import '../shared/constants/assistant_constants.dart';
import '../shared/enums/chat_failure_kind.dart';
import '../shared/types/answer_state.dart';
import '../shared/types/assistant_types.dart';
import '../shared/types/chat_state.dart';
import 'assistant_chat_controller.dart';
import 'widgets/chat_composer.dart';
import 'widgets/chat_message_list.dart';

/// Chat with streaming answers, citations, tool confirmations and errors.
class AssistantChatScreen extends StatelessWidget {
  /// Chat of [conversationId] backed by [repository].
  const AssistantChatScreen({
    super.key,
    required this.conversationId,
    required this.repository,
  });

  /// Id of the conversation shown.
  final String conversationId;

  /// Source of the messages.
  final AssistantRepository repository;

  @override
  Widget build(BuildContext context) {
    final l10n = AssistantLocalizations.of(context);
    return ControllerBuilder<AssistantChatController>(
      create: (context) =>
          AssistantChatController(repository, conversationId: conversationId)
            ..load(),
      builder: (context, controller) {
        _scheduleEffects(context, controller);
        return AppPage(
          title: l10n.chatTitle,
          onBack: () => context.go(assistantBasePath),
          body: SafeArea(
            child: AsyncValueView<List<ChatMessage>>(
              value: _messagesOf(controller.state),
              errorMessage: l10n.loadMessagesError,
              onRetry: controller.load,
              data: (messages) => Column(
                children: [
                  Expanded(
                    child: ChatMessageList(
                      messages: messages,
                      onToolDecision: (messageId, approved) =>
                          controller.respondToTool(
                            messageId: messageId,
                            approved: approved,
                          ),
                    ),
                  ),
                  ChatComposer(
                    isStreaming: controller.isStreaming,
                    onSend: controller.send,
                    onStop: controller.stop,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  static AsyncValue<List<ChatMessage>> _messagesOf(ChatState state) =>
      switch (state) {
        ChatLoading() => const AsyncValue.loading(),
        ChatFailed(:final error) => AsyncValue.error(error),
        ChatReady(:final messages) => AsyncValue.data(messages),
      };

  /// Shows the failure and announces the finished answer once each. Both
  /// are taken from the controller, so a rebuild never repeats them.
  ///
  /// The text is decided while the state still holds the failure kind.
  ///
  /// Captured now: the announcement runs after the frame, when the context may no longer be usable for lookups.
  static void _scheduleEffects(
    BuildContext context,
    AssistantChatController controller,
  ) {
    final error = controller.takeError();
    if (error != null) {
      final l10n = AssistantLocalizations.of(context);
      final isQuota = switch (controller.state) {
        ChatReady(answer: AnswerFailed(kind: ChatFailureKind.quotaExceeded)) =>
          true,
        _ => false,
      };
      final text = isQuota ? l10n.quotaExceeded : l10n.genericError;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) showActionError(context, error, message: text);
      });
    }

    final done = controller.takeFinishedAnswer();
    if (done != null) {
      final view = View.of(context);
      final direction = Directionality.of(context);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) {
          unawaited(
            SemanticsService.sendAnnouncement(view, done.text, direction),
          );
        }
      });
    }
  }
}
