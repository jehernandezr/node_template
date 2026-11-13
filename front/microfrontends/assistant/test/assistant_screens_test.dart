import 'dart:async';

import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_assistant/src/data/assistant_repository.dart';
import 'package:mf_assistant/src/data/fake_assistant_repository.dart';
import 'package:mf_assistant/src/shared/types/assistant_types.dart';
import 'package:mf_assistant/src/shared/enums/assistant_role.dart';
import 'package:ui/ui.dart';

import 'support.dart';

const _chunkDelay = Duration(milliseconds: 50);

/// Repository whose list and history calls the test controls.
base class _ControlledRepository extends FakeAssistantRepository {
  _ControlledRepository({this.list, this.history})
    : super(chunkDelay: _chunkDelay);

  final Future<List<Conversation>> Function()? list;
  final Future<List<ChatMessage>> Function(String id)? history;

  @override
  Future<List<Conversation>> listConversations() =>
      list?.call() ?? super.listConversations();

  @override
  Future<List<ChatMessage>> loadMessages(String conversationId) =>
      history?.call(conversationId) ?? super.loadMessages(conversationId);
}

const _failure = ApiErrorException(unavailableProblem);

Future<void> _pump(
  WidgetTester tester,
  AssistantRepository repository, {
  String location = '/assistant',
  Locale locale = const Locale('es'),
}) async {
  final scope = scopeWith(repository);
  addTearDown(scope.dispose);
  await tester.pumpWidget(
    assistantApp(scope: scope, location: location, locale: locale),
  );
  // Let the router and the deferred library load, but not async data.
  for (var i = 0; i < 5; i++) {
    await tester.pump(const Duration(milliseconds: 10));
  }
}

void main() {
  testWidgets('list shows loading, then the conversations', (tester) async {
    final gate = Completer<List<Conversation>>();
    await _pump(tester, _ControlledRepository(list: () => gate.future));
    await tester.pump();
    expect(find.byType(LoadingView), findsOneWidget);

    gate.complete(const [Conversation(id: 'x', title: 'Mi plan')]);
    await tester.pumpAndSettle();
    expect(find.text('Mi plan'), findsOneWidget);
    expect(find.byType(LoadingView), findsNothing);
  });

  testWidgets('list shows an error with retry and recovers', (tester) async {
    var calls = 0;
    await _pump(
      tester,
      _ControlledRepository(
        list: () async {
          calls++;
          if (calls == 1) throw _failure;
          return const [Conversation(id: 'x', title: 'Mi plan')];
        },
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('No pudimos cargar tus conversaciones.'), findsOneWidget);
    expect(find.textContaining('trace-123'), findsOneWidget);

    await tester.tap(find.text('Reintentar'));
    await tester.pumpAndSettle();
    expect(find.text('Mi plan'), findsOneWidget);
  });

  testWidgets('list shows the empty state', (tester) async {
    await _pump(tester, _ControlledRepository(list: () async => const []));
    await tester.pumpAndSettle();

    expect(find.byType(EmptyState), findsOneWidget);
    expect(find.text('Aún no tienes conversaciones'), findsOneWidget);
  });

  testWidgets('list is localized in en', (tester) async {
    await _pump(tester, FakeAssistantRepository(), locale: const Locale('en'));
    await tester.pumpAndSettle();

    expect(find.text('Assistant'), findsOneWidget);
    expect(find.text('New conversation'), findsOneWidget);
  });

  testWidgets('creating a conversation opens its chat', (tester) async {
    await _pump(tester, FakeAssistantRepository(chunkDelay: _chunkDelay));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Nueva conversación').first);
    await tester.pumpAndSettle();

    expect(find.byType(TextField), findsOneWidget);
    expect(find.text('Conversación'), findsOneWidget);
  });

  testWidgets('create failure shows a snack bar', (tester) async {
    final repository = _FailingCreate();
    await _pump(tester, repository);
    await tester.pumpAndSettle();

    await tester.tap(find.text('Nueva conversación'));
    await tester.pumpAndSettle();

    expect(
      find.textContaining('No pudimos crear la conversación.'),
      findsOneWidget,
    );
  });

  testWidgets('chat shows loading, then history', (tester) async {
    final gate = Completer<List<ChatMessage>>();
    await _pump(
      tester,
      _ControlledRepository(history: (_) => gate.future),
      location: '/assistant/c1',
    );
    await tester.pump();
    expect(find.byType(LoadingView), findsOneWidget);

    gate.complete(const [
      ChatMessage(id: 'm', role: AssistantRole.user, text: 'Hola previo'),
    ]);
    await tester.pumpAndSettle();
    expect(find.text('Hola previo'), findsOneWidget);
  });

  testWidgets('chat shows a history error with retry', (tester) async {
    var calls = 0;
    await _pump(
      tester,
      _ControlledRepository(
        history: (_) async {
          calls++;
          if (calls == 1) throw _failure;
          return const [];
        },
      ),
      location: '/assistant/c1',
    );
    await tester.pumpAndSettle();

    expect(find.text('No pudimos cargar la conversación.'), findsOneWidget);
    await tester.tap(find.text('Reintentar'));
    await tester.pumpAndSettle();
    expect(find.byType(TextField), findsOneWidget);
  });

  testWidgets('changing scope cuts the previous user stream and its text', (
    tester,
  ) async {
    final userA = FakeAssistantRepository(chunkDelay: _chunkDelay);
    final scopeA = scopeWith(userA, session: writerSession(userId: 'a'));
    await tester.pumpWidget(
      assistantApp(scope: scopeA, location: '/assistant/c1'),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'Hola');
    await tester.tap(find.widgetWithText(FilledButton, 'Enviar'));
    await tester.pump();
    await tester.pump(_chunkDelay);
    expect(find.textContaining('Puedo ayudarte'), findsOneWidget);

    // Identity change: the old scope closes and the page is rebuilt for the
    // new user with a fresh scope.
    await scopeA.dispose();
    final scopeB = newScope(session: writerSession(userId: 'b'));
    addTearDown(scopeB.dispose);
    await tester.pumpWidget(
      assistantApp(scope: scopeB, location: '/assistant/c1'),
    );
    await tester.pumpAndSettle(_chunkDelay * 5);

    expect(find.textContaining('Puedo ayudarte'), findsNothing);
    expect(find.text('Hola'), findsNothing);
    expect(find.widgetWithText(FilledButton, 'Enviar'), findsOneWidget);
  });

  testWidgets('closing the scope under a mounted chat stops the text', (
    tester,
  ) async {
    final repository = FakeAssistantRepository(chunkDelay: _chunkDelay);
    final scope = scopeWith(repository);
    await tester.pumpWidget(
      assistantApp(scope: scope, location: '/assistant/c1'),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'Hola');
    await tester.tap(find.widgetWithText(FilledButton, 'Enviar'));
    await tester.pump();
    await tester.pump(_chunkDelay);
    expect(find.textContaining('Puedo ayudarte'), findsOneWidget);

    await scope.dispose();
    await tester.pump(_chunkDelay * 5);
    await tester.pumpAndSettle();

    expect(find.textContaining('con tus tareas'), findsNothing);
    expect(find.widgetWithText(FilledButton, 'Enviar'), findsOneWidget);
  });

  testWidgets('leaving the chat mid-answer cancels the stream', (tester) async {
    final repository = FakeAssistantRepository(chunkDelay: _chunkDelay);
    final scope = scopeWith(repository);
    addTearDown(scope.dispose);
    await tester.pumpWidget(
      assistantApp(scope: scope, location: '/assistant/c1'),
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Hola');
    await tester.tap(find.widgetWithText(FilledButton, 'Enviar'));
    await tester.pump(_chunkDelay);

    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();

    expect(find.byType(TextField), findsNothing);
    expect(tester.takeException(), isNull);
  });
}

/// Fake whose `createConversation` fails.
base class _FailingCreate extends FakeAssistantRepository {
  @override
  Future<Conversation> createConversation() async => throw _failure;
}
