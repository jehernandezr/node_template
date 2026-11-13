import 'package:flutter_test/flutter_test.dart';
import 'package:mf_assistant/src/data/assistant_repository.dart';
import 'package:mf_assistant/src/data/fake_assistant_repository.dart';
import 'package:mf_assistant/src/screens/assistant_screens.dart';
import 'package:mf_assistant/src/shared/types/assistant_types.dart';

import 'support.dart';

const _delay = Duration(milliseconds: 20);

void main() {
  test('a fresh scope has no conversations from another scope', () async {
    final first = newScope().get<AssistantRepository>(
      createAssistantRepository,
    );
    await first.createConversation();
    expect(await first.listConversations(), hasLength(3));

    final second = newScope().get<AssistantRepository>(
      createAssistantRepository,
    );
    final conversations = await second.listConversations();
    expect(conversations.map((c) => c.id), ['c1', 'c2']);
  });

  test('one scope returns the same repository for the same type', () {
    final scope = newScope();
    final first = scope.get<AssistantRepository>(createAssistantRepository);
    final again = scope.get<AssistantRepository>(createAssistantRepository);
    expect(identical(first, again), isTrue);
  });

  test('closing the scope cuts the answer stream of that user', () async {
    final scope = newScope();
    final repository = scope.get<AssistantRepository>(
      createAssistantRepository,
    );
    final texts = <String>[];
    var done = false;
    repository.ask('c1', 'Hola').listen((chunk) {
      if (chunk is AssistantTextChunk) texts.add(chunk.text);
    }, onDone: () => done = true);
    // Default fake delay is 60 ms per chunk.
    await Future<void>.delayed(const Duration(milliseconds: 90));
    expect(texts, ['Puedo ayudarte ']);

    await scope.dispose();
    await Future<void>.delayed(const Duration(milliseconds: 300));

    expect(texts, ['Puedo ayudarte ']);
    expect(done, isTrue);
  });

  test('closing the scope rejects a pending tool confirmation', () async {
    final repository = FakeAssistantRepository(chunkDelay: _delay);
    final scope = scopeWith(repository);
    final requests = <ToolConfirmationRequest>[];
    repository.ask('c1', 'crear tarea').listen((chunk) {
      if (chunk is ToolConfirmationRequest) requests.add(chunk);
    });
    await Future<void>.delayed(_delay * 3);
    expect(requests, hasLength(1));

    await scope.dispose();

    expect(await requests.single.decision, isFalse);
    await Future<void>.delayed(_delay * 3);
  });

  test('a disposed repository answers nothing', () async {
    final repository = FakeAssistantRepository(chunkDelay: _delay)..dispose();
    expect(await repository.ask('c1', 'Hola').toList(), isEmpty);
  });
}
