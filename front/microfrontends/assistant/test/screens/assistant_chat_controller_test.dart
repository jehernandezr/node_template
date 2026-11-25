import 'dart:async';

import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mf_assistant/src/screens/assistant_chat_controller.dart';
import 'package:mf_assistant/src/shared/constants/assistant_constants.dart';
import 'package:mf_assistant/src/shared/enums/assistant_role.dart';
import 'package:mf_assistant/src/shared/enums/chat_failure_kind.dart';
import 'package:mf_assistant/src/shared/types/answer_state.dart';
import 'package:mf_assistant/src/shared/types/assistant_types.dart';
import 'package:mf_assistant/src/shared/types/chat_state.dart';
import 'package:test_utils/test_utils.dart';

import '../utils/scripted_assistant_repository.dart';

AssistantChatController _controllerFor(ScriptedAssistantRepository repo) {
  final controller = AssistantChatController(repo, conversationId: 'c1');
  addTearDown(controller.dispose);
  return controller;
}

/// A controller whose history is loaded and holds one earlier message.
Future<AssistantChatController> _ready(ScriptedAssistantRepository repo) async {
  final controller = _controllerFor(repo);
  unawaited(controller.load());
  repo.histories[0].complete(const [
    ChatMessage(id: 'h1', role: AssistantRole.user, text: 'Hola previo'),
  ]);
  await pumpEventQueue();
  return controller;
}

ChatReady _readyOf(AssistantChatController controller) =>
    controller.state as ChatReady;

void main() {
  group('AssistantChatController', () {
    test('starts loading and shows the history once it arrives', () async {
      final repo = ScriptedAssistantRepository();
      final controller = _controllerFor(repo);
      expect(controller.state, isA<ChatLoading>());

      const message = ChatMessage(
        id: 'h1',
        role: AssistantRole.user,
        text: 'Hola',
      );
      unawaited(controller.load());
      repo.histories.single.complete([message]);
      await pumpEventQueue();

      final state = _readyOf(controller);
      expect(state.messages, [message]);
      expect(state.answer, isA<AnswerIdle>());
    });

    test(
      'a failed history gives ChatFailed and a later load recovers',
      () async {
        final repo = ScriptedAssistantRepository();
        final controller = _controllerFor(repo);
        const error = FakeFailure();

        unawaited(controller.load());
        repo.histories[0].completeError(error);
        await pumpEventQueue();
        expect(
          controller.state,
          isA<ChatFailed>().having((s) => s.error, 'error', same(error)),
        );

        unawaited(controller.load());
        repo.histories[1].complete(const [
          ChatMessage(id: 'h1', role: AssistantRole.user, text: 'Hola'),
        ]);
        await pumpEventQueue();
        expect(controller.state, isA<ChatReady>());
      },
    );

    test('the answer of a load that was overtaken is dropped', () async {
      final repo = ScriptedAssistantRepository();
      final controller = _controllerFor(repo);
      const a = ChatMessage(id: 'a', role: AssistantRole.user, text: 'A');
      const b = ChatMessage(id: 'b', role: AssistantRole.user, text: 'B');

      unawaited(controller.load());
      unawaited(controller.load());
      repo.histories[1].complete([b]);
      await pumpEventQueue();
      repo.histories[0].complete([a]);
      await pumpEventQueue();

      expect(_readyOf(controller).messages, [b]);
    });

    test(
      'an old load that finishes first does not show before the new one',
      () async {
        final repo = ScriptedAssistantRepository();
        final controller = _controllerFor(repo);
        const a = ChatMessage(id: 'a', role: AssistantRole.user, text: 'A');
        const b = ChatMessage(id: 'b', role: AssistantRole.user, text: 'B');

        unawaited(controller.load());
        unawaited(controller.load());
        repo.histories[0].complete([a]);
        await pumpEventQueue();
        expect(controller.state, isA<ChatLoading>());

        repo.histories[1].complete([b]);
        await pumpEventQueue();
        expect(_readyOf(controller).messages, [b]);
      },
    );

    test('send while the history loads is ignored', () async {
      final repo = ScriptedAssistantRepository();
      final controller = _controllerFor(repo);
      const message = ChatMessage(
        id: 'h1',
        role: AssistantRole.user,
        text: 'Hola previo',
      );

      unawaited(controller.load());
      controller.send('hola');

      expect(controller.state, isA<ChatLoading>());
      expect(repo.asked, isEmpty);
      expect(controller.isStreaming, isFalse);

      repo.histories.single.complete([message]);
      await pumpEventQueue();
      expect(_readyOf(controller).messages, [message]);
    });

    test('a blank message asks nothing', () async {
      final repo = ScriptedAssistantRepository();
      final controller = await _ready(repo);

      controller.send('   ');

      expect(repo.asked, isEmpty);
      expect(_readyOf(controller).answer, isA<AnswerIdle>());
    });

    test('send trims the text and starts a streaming answer', () async {
      final repo = ScriptedAssistantRepository();
      final controller = await _ready(repo);

      controller.send('  Hola  ');

      expect(repo.asked, ['Hola']);
      final state = _readyOf(controller);
      expect(state.messages, hasLength(3));
      expect(state.messages[0].id, 'h1');
      expect(state.messages[1].role, AssistantRole.user);
      expect(state.messages[1].text, 'Hola');
      expect(state.messages[2].role, AssistantRole.assistant);
      expect(state.messages[2].isStreaming, isTrue);
      expect(
        state.answer,
        isA<AnswerStreaming>().having(
          (a) => a.messageId,
          'messageId',
          state.messages.last.id,
        ),
      );
      expect(controller.isStreaming, isTrue);
    });

    test('a second send while answering is ignored', () async {
      final repo = ScriptedAssistantRepository();
      final controller = await _ready(repo);

      controller.send('Hola');
      controller.send('Again');

      expect(repo.asked, hasLength(1));
    });

    test('text chunks accumulate in the assistant message', () async {
      final repo = ScriptedAssistantRepository();
      final controller = await _ready(repo);
      controller.send('Hola');

      repo.answers[0].add(const AssistantTextChunk('Puedo '));
      repo.answers[0].add(const AssistantTextChunk('ayudarte'));
      await pumpEventQueue();

      expect(_readyOf(controller).messages.last.text, 'Puedo ayudarte');
    });

    test('the final chunk sets citations and usage', () async {
      final repo = ScriptedAssistantRepository();
      final controller = await _ready(repo);
      controller.send('Hola');

      repo.answers[0].add(
        const AssistantFinalChunk(
          citations: [Citation(title: 't', sourceId: 's')],
          usage: TokenUsage(input: 1, output: 2),
        ),
      );
      await pumpEventQueue();

      final message = _readyOf(controller).messages.last;
      expect(message.citations.single.title, 't');
      expect(message.citations.single.sourceId, 's');
      expect(message.usage!.input, 1);
      expect(message.usage!.output, 2);
    });

    test('closing the stream finishes the answer once', () async {
      final repo = ScriptedAssistantRepository();
      final controller = await _ready(repo);
      controller.send('Hola');
      repo.answers[0].add(const AssistantTextChunk('Puedo ayudarte'));
      await pumpEventQueue();

      await repo.answers[0].close();
      await pumpEventQueue();

      final state = _readyOf(controller);
      expect(state.answer, isA<AnswerIdle>());
      expect(controller.isStreaming, isFalse);
      expect(state.messages.last.isStreaming, isFalse);

      final finished = controller.takeFinishedAnswer();
      expect(finished, isNotNull);
      expect(finished!.id, state.messages.last.id);
      expect(finished.text, 'Puedo ayudarte');
      expect(controller.takeFinishedAnswer(), isNull);
    });

    test(
      'a quota error fails the answer and drops the empty message',
      () async {
        final repo = ScriptedAssistantRepository();
        final controller = await _ready(repo);
        controller.send('Hola');
        final error = ApiErrorException(
          ProblemFixtures.withCode(quotaExceededCode, status: 429),
        );

        repo.answers[0].addError(error);
        await pumpEventQueue();

        final state = _readyOf(controller);
        expect(
          state.answer,
          isA<AnswerFailed>().having(
            (a) => a.kind,
            'kind',
            ChatFailureKind.quotaExceeded,
          ),
        );
        expect(state.messages.map((m) => m.role), [
          AssistantRole.user,
          AssistantRole.user,
        ]);
        expect(controller.takeError(), same(error));
        expect(controller.takeError(), isNull);
        expect(controller.takeFinishedAnswer(), isNull);
      },
    );

    test('a generic error gives the generic failure kind', () async {
      final repo = ScriptedAssistantRepository();
      final controller = await _ready(repo);
      controller.send('Hola');

      repo.answers[0].addError(const FakeFailure());
      await pumpEventQueue();

      expect(
        _readyOf(controller).answer,
        isA<AnswerFailed>().having(
          (a) => a.kind,
          'kind',
          ChatFailureKind.generic,
        ),
      );
    });

    test(
      'an error after partial text keeps the message, not streaming',
      () async {
        final repo = ScriptedAssistantRepository();
        final controller = await _ready(repo);
        controller.send('Hola');
        repo.answers[0].add(const AssistantTextChunk('Puedo'));
        await pumpEventQueue();

        repo.answers[0].addError(const FakeFailure());
        await pumpEventQueue();

        final state = _readyOf(controller);
        expect(state.messages, hasLength(3));
        expect(state.messages.last.text, 'Puedo');
        expect(state.messages.last.isStreaming, isFalse);
        expect(state.answer, isA<AnswerFailed>());
      },
    );

    test('sending again after a failure starts a new answer', () async {
      final repo = ScriptedAssistantRepository();
      final controller = await _ready(repo);
      controller.send('Hola');
      repo.answers[0].addError(const FakeFailure());
      await pumpEventQueue();

      controller.send('Again');

      expect(_readyOf(controller).answer, isA<AnswerStreaming>());
      expect(repo.asked, ['Hola', 'Again']);
      expect(controller.takeError(), isNull);
    });

    test(
      'stop keeps the text, marks it stopped and cancels the stream',
      () async {
        final repo = ScriptedAssistantRepository();
        final controller = await _ready(repo);
        controller.send('Hola');
        repo.answers[0].add(const AssistantTextChunk('Puedo'));
        await pumpEventQueue();

        controller.stop();

        final state = _readyOf(controller);
        expect(state.answer, isA<AnswerIdle>());
        expect(state.messages.last.text, 'Puedo');
        expect(state.messages.last.wasStopped, isTrue);
        expect(state.messages.last.isStreaming, isFalse);
        expect(repo.answers[0].hasListener, isFalse);
        expect(controller.takeFinishedAnswer(), isNull);
      },
    );

    test('stop rejects a pending tool confirmation', () async {
      final repo = ScriptedAssistantRepository();
      final controller = await _ready(repo);
      controller.send('Hola');
      final request = ToolConfirmationRequest(
        toolName: 'crear_tarea',
        summary: 'Tarea',
      );
      repo.answers[0].add(request);
      await pumpEventQueue();

      controller.stop();

      expect(await request.decision, isFalse);
      expect(_readyOf(controller).messages.last.toolApproved, isFalse);
    });

    test('responding to a tool confirmation resolves it once', () async {
      final repo = ScriptedAssistantRepository();
      final controller = await _ready(repo);
      controller.send('Hola');
      final request = ToolConfirmationRequest(
        toolName: 'crear_tarea',
        summary: 'Tarea',
      );
      repo.answers[0].add(request);
      await pumpEventQueue();
      final messageId = _readyOf(controller).messages.last.id;

      controller.respondToTool(messageId: messageId, approved: true);

      expect(request.isResolved, isTrue);
      expect(await request.decision, isTrue);
      expect(_readyOf(controller).messages.last.toolApproved, isTrue);

      controller.respondToTool(messageId: messageId, approved: false);

      expect(_readyOf(controller).messages.last.toolApproved, isTrue);
    });

    test(
      'dispose cancels the stream and rejects a pending confirmation',
      () async {
        final repo = ScriptedAssistantRepository();
        final controller = AssistantChatController(repo, conversationId: 'c1');
        unawaited(controller.load());
        repo.histories.single.complete(const [
          ChatMessage(id: 'h1', role: AssistantRole.user, text: 'Hola previo'),
        ]);
        await pumpEventQueue();
        controller.send('Hola');
        final request = ToolConfirmationRequest(
          toolName: 'crear_tarea',
          summary: 'Tarea',
        );
        repo.answers[0].add(request);
        await pumpEventQueue();

        var notifications = 0;
        controller.addListener(() => notifications++);
        controller.dispose();

        expect(repo.answers[0].hasListener, isFalse);
        expect(await request.decision, isFalse);

        final before = notifications;
        repo.answers[0].add(const AssistantTextChunk('tarde'));
        await pumpEventQueue();
        expect(notifications, before);
      },
    );

    test('load during an answer cancels the answer', () async {
      final repo = ScriptedAssistantRepository();
      final controller = await _ready(repo);
      controller.send('Hola');

      unawaited(controller.load());

      expect(repo.answers[0].hasListener, isFalse);
      expect(controller.state, isA<ChatLoading>());

      repo.histories[1].complete(const []);
      await pumpEventQueue();
      expect(_readyOf(controller).messages, isEmpty);
    });

    test('a chunk that arrives after stop does not change the state', () async {
      final repo = ScriptedAssistantRepository();
      final controller = await _ready(repo);
      controller.send('Hola');
      repo.answers[0].add(const AssistantTextChunk('Puedo'));
      await pumpEventQueue();
      controller.stop();
      final before = controller.state;

      repo.answers[0].add(const AssistantTextChunk(' tarde'));
      await pumpEventQueue();

      expect(identical(controller.state, before), isTrue);
    });
  });
}
