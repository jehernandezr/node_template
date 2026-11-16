import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_assistant/src/data/fake_assistant_repository.dart';
import 'package:mf_assistant/src/shared/constants/assistant_constants.dart';
import 'package:mf_assistant/src/shared/enums/assistant_operation.dart';
import 'package:mf_assistant/src/shared/types/assistant_types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

/// Pause between the chunks of the answers these tests stream.
const Duration _chunkDelay = Duration(milliseconds: 50);

void main() {
  group(FakeAssistantRepository, () {
    test('each instance keeps its own conversations', () async {
      final first = FakeAssistantRepository();
      final second = FakeAssistantRepository();

      await first.createConversation();

      final firstIds = (await first.listConversations()).map((c) => c.id);
      expect(firstIds, hasLength(3));
      expect(firstIds, contains('c3'));
      expect((await second.listConversations()).map((c) => c.id), ['c1', 'c2']);
    });

    testWidgets('streams the answer chunk by chunk with citations and usage', (
      tester,
    ) async {
      final repo = FakeAssistantRepository(chunkDelay: _chunkDelay);
      final texts = <String>[];
      AssistantFinalChunk? finalChunk;
      var done = false;
      repo.ask('c1', 'Hola').listen((chunk) {
        if (chunk is AssistantTextChunk) texts.add(chunk.text);
        if (chunk is AssistantFinalChunk) finalChunk = chunk;
      }, onDone: () => done = true);

      await tester.pump(_chunkDelay);
      expect(texts, ['Puedo ayudarte ']);
      await tester.pump(_chunkDelay);
      expect(texts, ['Puedo ayudarte ', 'con tus tareas ']);
      await tester.pump(_chunkDelay);
      expect(texts, hasLength(3));
      await tester.pump();

      expect(finalChunk!.citations, hasLength(2));
      expect(finalChunk!.usage.input, 412);
      expect(finalChunk!.usage.output, 48);
      expect(done, isTrue);
    });

    testWidgets('dispose in the middle of an answer ends the stream', (
      tester,
    ) async {
      final repo = FakeAssistantRepository(chunkDelay: _chunkDelay);
      final texts = <String>[];
      var done = false;
      repo.ask('c1', 'Hola').listen((chunk) {
        if (chunk is AssistantTextChunk) texts.add(chunk.text);
      }, onDone: () => done = true);

      await tester.pump(_chunkDelay);
      repo.dispose();
      await tester.pump(_chunkDelay * 6);

      expect(texts, ['Puedo ayudarte ']);
      expect(done, isTrue);
    });

    testWidgets('dispose rejects a pending tool confirmation', (tester) async {
      final repo = FakeAssistantRepository(chunkDelay: _chunkDelay);
      ToolConfirmationRequest? request;
      repo.ask('c1', 'crear tarea').listen((chunk) {
        if (chunk is ToolConfirmationRequest) request = chunk;
      });

      await tester.pump(_chunkDelay * 2);
      expect(request, isNotNull);

      repo.dispose();
      expect(await request!.decision, isFalse);
      await tester.pump(_chunkDelay * 6);
    });

    test('a disposed repository answers with an empty stream', () async {
      final repo = FakeAssistantRepository()..dispose();

      expect(await repo.ask('c1', 'Hola').toList(), isEmpty);
    });

    test('a quota question emits the quota ApiErrorException', () async {
      final repo = FakeAssistantRepository();

      await expectLater(
        repo.ask('c1', 'cuota'),
        emitsError(
          isA<ApiErrorException>().having(
            (e) => e.problem.code,
            'code',
            quotaExceededCode,
          ),
        ),
      );
    });

    test(
      'a failed history load throws once and the next call succeeds',
      () async {
        final behavior = DemoBehavior()
          ..failNext(
            const FakeFailure(),
            operation: AssistantOperation.loadMessages,
          );
        final repo = FakeAssistantRepository(behavior: behavior);

        await expectLater(repo.loadMessages('c1'), throwsA(isA<FakeFailure>()));

        final messages = await repo.loadMessages('c1');
        expect(messages.map((m) => m.id), ['seed-1', 'seed-2']);
      },
    );

    test(
      'a failure scheduled for ask is emitted by the answer stream',
      () async {
        final behavior = DemoBehavior()
          ..failNext(const FakeFailure(), operation: AssistantOperation.ask);
        final repo = FakeAssistantRepository(behavior: behavior);

        await expectLater(
          repo.ask('c1', 'Hola'),
          emitsError(isA<FakeFailure>()),
        );
      },
    );

    group('tool confirmation', () {
      testWidgets('confirming ends the answer with the done text', (
        tester,
      ) async {
        final repo = FakeAssistantRepository(chunkDelay: _chunkDelay);
        final texts = <String>[];
        ToolConfirmationRequest? request;
        repo.ask('c1', 'crear tarea').listen((chunk) {
          if (chunk is AssistantTextChunk) texts.add(chunk.text);
          if (chunk is ToolConfirmationRequest) request = chunk;
        });

        await tester.pump(_chunkDelay * 2);
        request!.confirm();
        await tester.pump(_chunkDelay * 2);
        await tester.pump();

        expect(texts.last, 'Listo, la tarea quedó creada.');
      });

      testWidgets('rejecting ends the answer with the skipped text', (
        tester,
      ) async {
        final repo = FakeAssistantRepository(chunkDelay: _chunkDelay);
        final texts = <String>[];
        ToolConfirmationRequest? request;
        repo.ask('c1', 'crear tarea').listen((chunk) {
          if (chunk is AssistantTextChunk) texts.add(chunk.text);
          if (chunk is ToolConfirmationRequest) request = chunk;
        });

        await tester.pump(_chunkDelay * 2);
        request!.reject();
        await tester.pump(_chunkDelay * 2);
        await tester.pump();

        expect(texts.last, 'Entendido, no creé la tarea.');
      });
    });
  });
}
