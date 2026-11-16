import 'dart:async';

import 'package:contracts/contracts.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_assistant/src/data/fake_assistant_repository.dart';
import 'package:mf_assistant/src/screens/assistant_list_screen.dart';
import 'package:mf_assistant/src/shared/enums/assistant_operation.dart';
import 'package:mf_assistant/src/shared/types/assistant_types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

import '../utils/assistant_test_app.dart';

/// Fake whose conversation list arrives when the test completes [_list].
base class _ControlledList extends FakeAssistantRepository {
  _ControlledList(this._list);

  final Completer<List<Conversation>> _list;

  @override
  Future<List<Conversation>> listConversations() => _list.future;
}

/// Fake whose conversation list is empty.
base class _EmptyList extends FakeAssistantRepository {
  @override
  Future<List<Conversation>> listConversations() async => const [];
}

/// Fake whose creation breaks the contract of its route.
base class _ThrowingCreate extends FakeAssistantRepository {
  @override
  Future<Conversation> createConversation() async =>
      throw ContractViolationException(
        routeId: 'assistant.conversations.create',
        errors: [FieldError(code: PlatformErrorCode.validationRequired.code)],
      );
}

void main() {
  group(AssistantListScreen, () {
    testWidgets('muestra cargando y luego las conversaciones', (tester) async {
      final list = Completer<List<Conversation>>();
      await pumpAssistantRoutes(tester, repository: _ControlledList(list));
      expect(find.byType(LoadingView), findsOneWidget);

      list.complete(const [Conversation(id: 'c1', title: 'Plan de la semana')]);
      await tester.runAsync(pumpEventQueue);
      await tester.pumpAndSettle();

      expect(find.text('Plan de la semana'), findsOneWidget);
    });

    testWidgets('un error al listar ofrece reintentar', (tester) async {
      final behavior = DemoBehavior()
        ..failNext(
          const FakeFailure(),
          operation: AssistantOperation.listConversations,
        );
      await pumpAssistantRoutes(
        tester,
        repository: FakeAssistantRepository(behavior: behavior),
      );
      await tester.pumpAndSettle();

      expect(
        find.text('No pudimos cargar tus conversaciones.'),
        findsOneWidget,
      );
      expect(find.text('Reintentar'), findsOneWidget);

      await tester.tap(find.text('Reintentar'));
      await tester.pumpAndSettle();

      expect(find.text('Plan de la semana'), findsOneWidget);
    });

    testWidgets('sin conversaciones muestra el estado vacío', (tester) async {
      await pumpAssistantRoutes(tester, repository: _EmptyList());
      await tester.pumpAndSettle();

      expect(find.byType(EmptyState), findsOneWidget);
      expect(find.text('Aún no tienes conversaciones'), findsOneWidget);
    });

    testWidgets('con locale en los textos salen en inglés', (tester) async {
      await pumpAssistantRoutes(
        tester,
        repository: FakeAssistantRepository(),
        locale: const Locale('en'),
      );
      await tester.pumpAndSettle();

      expect(find.text('Assistant'), findsOneWidget);
      expect(find.text('New conversation'), findsOneWidget);
    });

    testWidgets('crear una conversación abre su chat', (tester) async {
      final router = await pumpAssistantRoutes(
        tester,
        repository: FakeAssistantRepository(),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Nueva conversación'));
      await tester.pumpAndSettle();

      expect(
        router.routerDelegate.currentConfiguration.uri.path,
        '/assistant/c3',
      );
      expect(find.byType(TextField), findsOneWidget);
    });

    testWidgets('un fallo al crear muestra el aviso', (tester) async {
      final behavior = DemoBehavior()
        ..failNext(
          const FakeFailure(),
          operation: AssistantOperation.createConversation,
        );
      await pumpAssistantRoutes(
        tester,
        repository: FakeAssistantRepository(behavior: behavior),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Nueva conversación'));
      await tester.pumpAndSettle();

      expect(
        find.textContaining('No pudimos crear la conversación.'),
        findsOneWidget,
      );
    });

    testWidgets('una violación de contrato al crear no escapa', (tester) async {
      await pumpAssistantRoutes(tester, repository: _ThrowingCreate());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Nueva conversación'));
      await tester.pumpAndSettle();

      expect(
        find.textContaining('No pudimos crear la conversación.'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    });

    testWidgets('la lista cargada es accesible', (tester) async {
      await pumpAssistantRoutes(tester, repository: FakeAssistantRepository());
      await tester.pumpAndSettle();

      await expectAccessible(tester);
    });

    testWidgets('con texto al doble de tamaño la lista no se desborda', (
      tester,
    ) async {
      final repo = FakeAssistantRepository();
      addTearDown(repo.dispose);
      await pumpAtTextScale(
        tester,
        assistantTestApp(AssistantListScreen(repository: repo)),
      );
      await tester.pumpAndSettle();

      expect(find.text('Plan de la semana'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
