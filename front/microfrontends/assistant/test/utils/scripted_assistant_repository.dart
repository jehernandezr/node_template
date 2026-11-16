import 'dart:async';

import 'package:mf_assistant/src/data/assistant_repository.dart';
import 'package:mf_assistant/src/shared/types/assistant_types.dart';

/// Repository that the test drives by hand: each history load finishes when
/// the test completes it and each answer is a stream the test feeds. Nothing
/// depends on real time.
final class ScriptedAssistantRepository implements AssistantRepository {
  /// One completer per call to [loadMessages], in call order.
  final List<Completer<List<ChatMessage>>> histories = [];

  /// One controller per call to [ask], in call order. Feed it with `add`,
  /// `addError` and `close`.
  final List<StreamController<AssistantChunk>> answers = [];

  /// The text of each call to [ask], in call order.
  final List<String> asked = [];

  /// Whether [dispose] ran.
  bool isDisposed = false;

  @override
  Future<List<Conversation>> listConversations() async => const [];

  @override
  Future<Conversation> createConversation() =>
      Future.value(const Conversation(id: 'new', title: 'Nueva'));

  @override
  Future<List<ChatMessage>> loadMessages(String conversationId) {
    final completer = Completer<List<ChatMessage>>();
    histories.add(completer);
    return completer.future;
  }

  @override
  Stream<AssistantChunk> ask(String conversationId, String message) {
    asked.add(message);
    final controller = StreamController<AssistantChunk>();
    answers.add(controller);
    return controller.stream;
  }

  @override
  void dispose() => isDisposed = true;
}
