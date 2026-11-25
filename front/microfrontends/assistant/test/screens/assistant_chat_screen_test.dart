import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_assistant/src/data/fake_assistant_repository.dart';
import 'package:mf_assistant/src/screens/assistant_chat_screen.dart';
import 'package:mf_assistant/src/shared/constants/assistant_constants.dart';
import 'package:mf_assistant/src/shared/constants/assistant_layout.dart';
import 'package:mf_assistant/src/shared/enums/assistant_role.dart';
import 'package:mf_assistant/src/shared/types/assistant_types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/assistant_test_app.dart';
import '../utils/scripted_assistant_repository.dart';

const ChatMessage _previous = ChatMessage(
  id: 'h1',
  role: AssistantRole.assistant,
  text: 'Hola previo',
);

const List<Citation> _citations = [
  Citation(title: 'Plan semanal de tareas', sourceId: 'doc-101'),
  Citation(title: 'Notas', sourceId: 'note-42'),
];

const TokenUsage _usage = TokenUsage(input: 412, output: 48);

/// Pause between the chunks of the demo answers these tests stream.
const Duration _chunkDelay = Duration(milliseconds: 50);

Finder _button(String label) => find.widgetWithText(FilledButton, label);

/// Mounts the chat of `c1` and completes its history with [messages].
Future<ScriptedAssistantRepository> _mountWithHistory(
  WidgetTester tester, {
  List<ChatMessage> messages = const [],
  UserSession? session,
  Locale locale = const Locale('es'),
}) async {
  final repo = ScriptedAssistantRepository();
  await pumpAssistantRoutes(
    tester,
    repository: repo,
    location: '/assistant/c1',
    session: session,
    locale: locale,
  );
  repo.histories[0].complete(messages);
  await tester.runAsync(pumpEventQueue);
  await tester.pumpAndSettle();
  return repo;
}

Future<void> _send(WidgetTester tester, String text) async {
  await tester.enterText(find.byType(TextField), text);
  await tester.tap(_button('Enviar'));
  await tester.pump();
}

/// Runs [action] on the fake stream, then lets its event reach the screen.
Future<void> _emit(WidgetTester tester, void Function() action) async {
  action();
  await tester.runAsync(pumpEventQueue);
  await tester.pump();
}

void main() {
  group(AssistantChatScreen, () {
    testWidgets('shows loading and then the history', (tester) async {
      final repo = ScriptedAssistantRepository();
      await pumpAssistantRoutes(
        tester,
        repository: repo,
        location: '/assistant/c1',
      );
      expect(find.byType(LoadingView), findsOneWidget);

      repo.histories[0].complete([_previous]);
      await tester.runAsync(pumpEventQueue);
      await tester.pumpAndSettle();

      expect(find.text('Hola previo'), findsOneWidget);
    });

    testWidgets('a load error offers retry and reloads the history', (
      tester,
    ) async {
      final repo = ScriptedAssistantRepository();
      await pumpAssistantRoutes(
        tester,
        repository: repo,
        location: '/assistant/c1',
      );
      repo.histories[0].completeError(const FakeFailure());
      await tester.runAsync(pumpEventQueue);
      await tester.pumpAndSettle();

      expect(find.text('No pudimos cargar la conversación.'), findsOneWidget);
      expect(find.text('Reintentar'), findsOneWidget);

      await tester.tap(find.text('Reintentar'));
      await tester.pump();
      expect(repo.histories.length, 2);

      repo.histories[1].complete(const []);
      await tester.runAsync(pumpEventQueue);
      await tester.pumpAndSettle();
      expect(find.byType(TextField), findsOneWidget);
    });

    testWidgets('sending a question shows the streamed text', (tester) async {
      final repo = await _mountWithHistory(tester);

      await _send(tester, 'Hola');
      expect(repo.asked, ['Hola']);

      await _emit(
        tester,
        () => repo.answers[0].add(const AssistantTextChunk('Puedo ayudarte ')),
      );
      expect(find.textContaining('Puedo ayudarte'), findsOneWidget);
      expect(_button('Detener'), findsOneWidget);

      await _emit(tester, () => repo.answers[0].close());
      expect(_button('Enviar'), findsOneWidget);
    });

    testWidgets('stopping cuts the answer and keeps the received text', (
      tester,
    ) async {
      final repo = await _mountWithHistory(tester);
      await _send(tester, 'Hola');
      await _emit(
        tester,
        () => repo.answers[0].add(const AssistantTextChunk('Puedo ayudarte ')),
      );

      await tester.tap(_button('Detener'));
      await tester.pump();

      expect(repo.answers[0].hasListener, isFalse);
      expect(find.text('Respuesta detenida.'), findsOneWidget);
      expect(find.textContaining('Puedo ayudarte'), findsOneWidget);
    });

    testWidgets('shows sources and token usage when finished', (tester) async {
      final repo = await _mountWithHistory(tester);
      await _send(tester, 'Hola');

      await _emit(
        tester,
        () => repo.answers[0].add(
          const AssistantFinalChunk(citations: _citations, usage: _usage),
        ),
      );
      await _emit(tester, () => repo.answers[0].close());

      expect(find.text('Fuentes'), findsOneWidget);
      expect(find.text('Plan semanal de tareas'), findsOneWidget);
      expect(find.text('Notas'), findsOneWidget);
      expect(find.textContaining('Tokens: 412'), findsOneWidget);
    });

    testWidgets('confirming a tool resolves the request', (tester) async {
      final repo = await _mountWithHistory(tester);
      await _send(tester, 'Crea una tarea');
      final request = ToolConfirmationRequest(
        toolName: 'crear_tarea',
        summary: 'Crear una tarea nueva en tu lista de pendientes.',
      );
      await _emit(tester, () => repo.answers[0].add(request));

      expect(
        find.text('El asistente quiere ejecutar una acción'),
        findsOneWidget,
      );
      await tester.ensureVisible(_button('Confirmar'));
      await tester.tap(_button('Confirmar'));
      await tester.pump();

      expect(request.isResolved, isTrue);
      expect(await request.decision, isTrue);
      expect(find.text('Acción confirmada'), findsOneWidget);
    });

    testWidgets('cancelling a tool reports decision false', (tester) async {
      final repo = await _mountWithHistory(tester);
      await _send(tester, 'Crea una tarea');
      final request = ToolConfirmationRequest(
        toolName: 'crear_tarea',
        summary: 'Crear una tarea nueva en tu lista de pendientes.',
      );
      await _emit(tester, () => repo.answers[0].add(request));

      await tester.ensureVisible(
        find.widgetWithText(OutlinedButton, 'Cancelar'),
      );
      await tester.tap(find.widgetWithText(OutlinedButton, 'Cancelar'));
      await tester.pump();

      expect(await request.decision, isFalse);
      expect(find.text('Acción cancelada'), findsOneWidget);
    });

    testWidgets('without task permission it can only cancel', (tester) async {
      final repo = await _mountWithHistory(tester, session: readerSession());
      await _send(tester, 'Crea una tarea');
      await _emit(
        tester,
        () => repo.answers[0].add(
          ToolConfirmationRequest(toolName: 'crear_tarea', summary: 'Crear.'),
        ),
      );

      expect(find.text('Confirmar'), findsNothing);
      expect(find.text('Cancelar'), findsOneWidget);
    });

    testWidgets('with task permission it can confirm', (tester) async {
      final repo = await _mountWithHistory(tester, session: writerSession());
      await _send(tester, 'Crea una tarea');
      await _emit(
        tester,
        () => repo.answers[0].add(
          ToolConfirmationRequest(toolName: 'crear_tarea', summary: 'Crear.'),
        ),
      );

      expect(find.text('Confirmar'), findsOneWidget);
      expect(find.text('Cancelar'), findsOneWidget);
    });

    testWidgets('an exhausted quota shows the message with the code', (
      tester,
    ) async {
      final repo = await _mountWithHistory(tester);
      await _send(tester, 'Hola');

      repo.answers[0].addError(
        ApiErrorException(
          ProblemFixtures.withCode(quotaExceededCode, status: 429),
        ),
      );
      await tester.runAsync(pumpEventQueue);
      await tester.pump();
      await tester.pump();

      expect(
        find.textContaining('Alcanzaste el límite de consultas de tu plan.'),
        findsOneWidget,
      );
      expect(find.textContaining(quotaExceededCode), findsOneWidget);
    });

    testWidgets('a generic error shows the generic message', (tester) async {
      final repo = await _mountWithHistory(tester);
      await _send(tester, 'Hola');

      repo.answers[0].addError(const FakeFailure());
      await tester.runAsync(pumpEventQueue);
      await tester.pump();
      await tester.pump();

      expect(
        find.textContaining('Ocurrió un error inesperado.'),
        findsOneWidget,
      );
    });

    testWidgets('the error notice appears only once', (tester) async {
      final repo = await _mountWithHistory(tester);
      await _send(tester, 'Hola');
      repo.answers[0].addError(const FakeFailure());
      await tester.runAsync(pumpEventQueue);
      await tester.pump();

      await tester.pump();
      await tester.enterText(find.byType(TextField), 'Another');
      await tester.pump();

      expect(find.byType(SnackBar), findsOneWidget);
    });

    testWidgets('with the en locale texts are in English', (tester) async {
      await _mountWithHistory(tester, locale: const Locale('en'));

      expect(find.text('Conversation'), findsOneWidget);
      expect(find.text('Send'), findsOneWidget);
    });

    testWidgets('with the en locale the quota message is in English', (
      tester,
    ) async {
      final repo = await _mountWithHistory(tester, locale: const Locale('en'));
      await tester.enterText(find.byType(TextField), 'Hello');
      await tester.tap(find.widgetWithText(FilledButton, 'Send'));
      await tester.pump();
      repo.answers[0].addError(
        ApiErrorException(
          ProblemFixtures.withCode(quotaExceededCode, status: 429),
        ),
      );
      await tester.runAsync(pumpEventQueue);
      await tester.pump();
      await tester.pump();

      expect(
        find.textContaining("You have reached your plan's query limit."),
        findsOneWidget,
      );
    });

    testWidgets('the field has a visible label', (tester) async {
      await _mountWithHistory(tester);

      expect(
        tester.widget<TextField>(find.byType(TextField)).decoration!.labelText,
        'Escribe tu pregunta',
      );
    });

    testWidgets('the chat with answers and a pending card is accessible', (
      tester,
    ) async {
      final repo = await _mountWithHistory(tester);
      await _send(tester, 'Hola');
      await _emit(
        tester,
        () => repo.answers[0].add(const AssistantTextChunk('Puedo ayudarte.')),
      );
      await _emit(
        tester,
        () => repo.answers[0].add(
          const AssistantFinalChunk(citations: _citations, usage: _usage),
        ),
      );
      await _emit(tester, () => repo.answers[0].close());

      await _send(tester, 'Crea una tarea');
      await _emit(
        tester,
        () => repo.answers[1].add(
          ToolConfirmationRequest(
            toolName: 'crear_tarea',
            summary: 'Crear una tarea nueva en tu lista de pendientes.',
          ),
        ),
      );
      await tester.pump();

      await expectAccessible(tester);
    });

    testWidgets('the complete answer is announced only once', (tester) async {
      final repo = await _mountWithHistory(tester);
      tester.takeAnnouncements();
      await _send(tester, 'Hola');

      await _emit(
        tester,
        () => repo.answers[0].add(const AssistantTextChunk('Puedo ')),
      );
      await _emit(
        tester,
        () => repo.answers[0].add(const AssistantTextChunk('ayudarte ')),
      );
      await _emit(
        tester,
        () => repo.answers[0].add(const AssistantTextChunk('con tus tareas.')),
      );
      expect(tester.takeAnnouncements(), isEmpty);

      repo.answers[0].close();
      await tester.runAsync(pumpEventQueue);
      await tester.pump();
      await tester.pump();

      final announcements = tester.takeAnnouncements();
      expect(announcements, hasLength(1));
      expect(announcements.single.message, 'Puedo ayudarte con tus tareas.');
    });

    testWidgets('a stopped answer is not announced', (tester) async {
      final repo = await _mountWithHistory(tester);
      tester.takeAnnouncements();
      await _send(tester, 'Hola');
      await _emit(
        tester,
        () => repo.answers[0].add(const AssistantTextChunk('Puedo ayudarte')),
      );

      await tester.tap(_button('Detener'));
      await tester.pump();
      await tester.pump();

      expect(tester.takeAnnouncements(), isEmpty);
    });

    testWidgets('an answer with an error is not announced', (tester) async {
      final repo = await _mountWithHistory(tester);
      tester.takeAnnouncements();
      await _send(tester, 'Hola');

      repo.answers[0].addError(const FakeFailure());
      await tester.runAsync(pumpEventQueue);
      await tester.pump();
      await tester.pump();

      expect(tester.takeAnnouncements(), isEmpty);
    });

    testWidgets('closing the scope mid-answer cuts the text', (tester) async {
      final scope = TestScope();
      await pumpAssistantRoutes(
        tester,
        repository: FakeAssistantRepository(chunkDelay: _chunkDelay),
        location: '/assistant/c1',
        scope: scope,
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Hola');
      await tester.tap(_button('Enviar'));
      await tester.pump();
      await tester.pump(_chunkDelay);
      expect(find.textContaining('Puedo ayudarte'), findsOneWidget);

      await scope.scope.dispose();
      await tester.pump(_chunkDelay * 6);

      expect(find.textContaining('con tus tareas'), findsNothing);
      expect(_button('Enviar'), findsOneWidget);
    });

    testWidgets('switching identity cuts the previous answer', (tester) async {
      final scopeA = TestScope();
      await pumpAssistantRoutes(
        tester,
        repository: FakeAssistantRepository(chunkDelay: _chunkDelay),
        location: '/assistant/c1',
        scope: scopeA,
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Hola');
      await tester.tap(_button('Enviar'));
      await tester.pump();
      await tester.pump(_chunkDelay);
      expect(find.textContaining('Puedo ayudarte'), findsOneWidget);

      await scopeA.scope.dispose();
      final scopeB = TestScope(userId: 'b');
      await pumpAssistantRoutes(
        tester,
        repository: FakeAssistantRepository(chunkDelay: _chunkDelay),
        location: '/assistant/c1',
        session: writerSession(userId: 'b'),
        scope: scopeB,
      );
      await tester.pumpAndSettle();
      await tester.pump(_chunkDelay * 6);

      expect(find.textContaining('Puedo ayudarte'), findsNothing);
      expect(find.text('Hola'), findsNothing);
      expect(_button('Enviar'), findsOneWidget);
    });

    testWidgets('leaving the chat mid-answer cancels the stream', (
      tester,
    ) async {
      await pumpAssistantRoutes(
        tester,
        repository: FakeAssistantRepository(chunkDelay: _chunkDelay),
        location: '/assistant/c1',
      );
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Hola');
      await tester.tap(_button('Enviar'));
      await tester.pump();
      await tester.pump(_chunkDelay);

      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      await tester.pump(_chunkDelay * 6);

      expect(find.byType(TextField), findsNothing);
      expect(tester.takeException(), isNull);
    });

    testWidgets('a long assistant message does not exceed the reading width', (
      tester,
    ) async {
      final repo = ScriptedAssistantRepository();
      final long = ChatMessage(
        id: 'long',
        role: AssistantRole.assistant,
        text: 'palabra ' * 120,
      );
      await pumpAtWidths(
        tester,
        assistantTestApp(
          AssistantChatScreen(conversationId: 'c1', repository: repo),
        ),
        widths: const [320, 1280],
        check: (width) async {
          if (!repo.histories.single.isCompleted) {
            repo.histories.single.complete([long]);
            await tester.runAsync(pumpEventQueue);
          }
          await tester.pumpAndSettle();
          final card = find.ancestor(
            of: find.text(long.text),
            matching: find.byType(Card),
          );
          final cardWidth = tester.getSize(card).width;
          expect(cardWidth, lessThanOrEqualTo(AssistantLayout.bubbleMaxWidth));
          expect(cardWidth, lessThan(width));
          expect(tester.takeException(), isNull);
        },
      );
      // The wide window is the one where the limit has to hold the text back.
      expect(
        tester.getSize(find.byType(Card)).width,
        AssistantLayout.bubbleMaxWidth,
      );
    });

    testWidgets('with text at double size the chat does not overflow', (
      tester,
    ) async {
      final repo = FakeAssistantRepository();
      addTearDown(repo.dispose);
      await pumpAtTextScale(
        tester,
        assistantTestApp(
          AssistantChatScreen(conversationId: 'c1', repository: repo),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Esta semana tienes tres entregas.'), findsOneWidget);
      expect(find.widgetWithText(FilledButton, 'Enviar'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
