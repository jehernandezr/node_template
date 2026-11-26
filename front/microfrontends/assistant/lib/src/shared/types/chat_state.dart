import 'answer_state.dart';
import 'assistant_types.dart';

/// State of a conversation screen.
sealed class ChatState {
  const ChatState();
}

/// The history is loading.
final class ChatLoading extends ChatState {
  /// The conversation is loading.
  const ChatLoading();
}

/// The history is on screen. [answer] tells whether a reply is arriving.
final class ChatReady extends ChatState {
  /// The conversation with its [messages] and the state of the [answer].
  const ChatReady(this.messages, this.answer);

  /// Messages of the conversation.
  final List<ChatMessage> messages;

  /// State of the answer in course.
  final AnswerState answer;
}

/// The history could not be loaded.
final class ChatFailed extends ChatState {
  /// The conversation could not load because of [error].
  const ChatFailed(this.error);

  /// Error of the load.
  final Object error;
}
