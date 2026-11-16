import 'answer_state.dart';
import 'assistant_types.dart';

/// State of a conversation screen.
sealed class ChatState {
  const ChatState();
}

/// The history is loading.
final class ChatLoading extends ChatState {
  const ChatLoading();
}

/// The history is on screen. [answer] tells whether a reply is arriving.
final class ChatReady extends ChatState {
  const ChatReady(this.messages, this.answer);

  final List<ChatMessage> messages;
  final AnswerState answer;
}

/// The history could not be loaded.
final class ChatFailed extends ChatState {
  const ChatFailed(this.error);

  final Object error;
}
