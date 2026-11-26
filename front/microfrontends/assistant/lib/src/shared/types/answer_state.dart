import '../enums/chat_failure_kind.dart';

/// State of the answer to the last message.
sealed class AnswerState {
  const AnswerState();
}

/// No answer in progress.
final class AnswerIdle extends AnswerState {
  /// No answer in course.
  const AnswerIdle();
}

/// The answer to the assistant message [messageId] is arriving.
final class AnswerStreaming extends AnswerState {
  /// The answer [messageId] is being streamed.
  const AnswerStreaming(this.messageId);

  /// Message being streamed.
  final String messageId;
}

/// The last answer failed. The next `send` goes back to [AnswerStreaming].
final class AnswerFailed extends AnswerState {
  /// The answer failed with [kind].
  const AnswerFailed(this.kind);

  /// Kind of failure.
  final ChatFailureKind kind;
}
