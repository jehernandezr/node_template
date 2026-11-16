import '../enums/chat_failure_kind.dart';

/// State of the answer to the last message.
sealed class AnswerState {
  const AnswerState();
}

/// No answer in progress.
final class AnswerIdle extends AnswerState {
  const AnswerIdle();
}

/// The answer to the assistant message [messageId] is arriving.
final class AnswerStreaming extends AnswerState {
  const AnswerStreaming(this.messageId);

  final String messageId;
}

/// The last answer failed. The next `send` goes back to [AnswerStreaming].
final class AnswerFailed extends AnswerState {
  const AnswerFailed(this.kind);

  final ChatFailureKind kind;
}
