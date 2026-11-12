import 'package:contracts/contracts.dart';

import 'assistant_models.dart';

/// Access to conversations and to the streamed answers of the assistant.
///
/// The production implementation calls the API (SSE for [ask]). The UI only
/// depends on this interface.
abstract interface class AssistantRepository {
  Future<List<Conversation>> listConversations();

  Future<Conversation> createConversation();

  Future<List<ChatMessage>> loadMessages(String conversationId);

  /// Streams the answer to [message]. Errors are emitted as
  /// [ApiErrorException] from `contracts`. Cancelling the subscription stops the answer.
  Stream<AssistantChunk> ask(String conversationId, String message);
}
