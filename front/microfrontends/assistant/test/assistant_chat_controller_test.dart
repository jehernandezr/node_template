import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mf_assistant/src/data/assistant_models.dart';
import 'package:mf_assistant/src/data/assistant_repository.dart';
import 'package:mf_assistant/src/presentation/assistant_chat_controller.dart';

/// Repository whose answer stream is driven by the test.
final class _ManualRepository implements AssistantRepository {
  _ManualRepository(this.answer);

  final Stream<AssistantChunk> answer;

  @override
  Future<List<Conversation>> listConversations() async => const [];

  @override
  Future<Conversation> createConversation() => throw UnimplementedError();

  @override
  Future<List<ChatMessage>> loadMessages(String conversationId) async =>
      const [];

  @override
  Stream<AssistantChunk> ask(String conversationId, String message) => answer;
}

void main() {
  test('dispose cancels the answer stream', () async {
    var cancelled = false;
    final source = StreamController<AssistantChunk>(
      onCancel: () => cancelled = true,
    );
    final controller = AssistantChatController(
      repository: _ManualRepository(source.stream),
      conversationId: 'c1',
    )..send('Hola');
    expect(controller.isStreaming, isTrue);

    controller.dispose();

    expect(cancelled, isTrue);
    expect(source.hasListener, isFalse);
    await source.close();
  });

  test(
    'dispose rejects a tool confirmation nobody can answer anymore',
    () async {
      final source = StreamController<AssistantChunk>();
      final request = ToolConfirmationRequest(
        toolName: 'crear_tarea',
        summary: 'Tarea',
      );
      final controller = AssistantChatController(
        repository: _ManualRepository(source.stream),
        conversationId: 'c1',
      )..send('crear una tarea');

      source.add(request);
      await Future<void>.delayed(Duration.zero);
      controller.dispose();

      expect(await request.decision, isFalse);
      await source.close();
    },
  );
}
