import 'package:contracts/contracts.dart';
import 'package:shell_core/shell_core.dart';

import '../shared/types/assistant_types.dart';

/// Access to conversations and to the streamed answers of the assistant.
///
/// The production implementation will call the API (SSE for [ask]); the
/// backend has no assistant contract yet, so only the fake exists. The UI only
/// depends on this interface.
///
/// The scope disposes the repository when the identity changes. [dispose]
/// must cancel every answer in progress, so nothing of one user reaches the
/// next one.
abstract interface class AssistantRepository implements ScopedResource {
  Future<List<Conversation>> listConversations();

  Future<Conversation> createConversation();

  Future<List<ChatMessage>> loadMessages(String conversationId);

  /// Streams the answer to [message]. Errors are emitted as
  /// [ApiErrorException] from `contracts`. Cancelling the subscription stops
  /// the answer; so does [dispose], which ends the stream.
  Stream<AssistantChunk> ask(String conversationId, String message);
}
