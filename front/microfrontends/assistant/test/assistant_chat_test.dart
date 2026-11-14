import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_assistant/src/data/fake_assistant_repository.dart';
import 'package:mf_assistant/src/l10n/generated/assistant_localizations.dart';
import 'package:shell_core/shell_core.dart';

import 'support.dart';

const _answer = 'Puedo ayudarte con tus tareas pendientes.';
const _chunkDelay = Duration(milliseconds: 50);

Future<void> _pumpChat(
  WidgetTester tester, {
  Locale locale = const Locale('es'),
  UserSession? session,
}) async {
  final scope = scopeWith(
    FakeAssistantRepository(chunkDelay: _chunkDelay),
    session: session,
  );
  addTearDown(scope.dispose);
  await tester.pumpWidget(
    assistantApp(scope: scope, location: '/assistant/c1', locale: locale),
  );
  await tester.pumpAndSettle();
}

/// Lets the whole scripted answer arrive: its chunks are timers, so frames
/// alone do not advance them.
Future<void> _settle(WidgetTester tester) async {
  await tester.pump(_chunkDelay * 10);
  await tester.pumpAndSettle();
}

Future<void> _send(WidgetTester tester, String text) async {
  await tester.enterText(find.byType(TextField), text);
  await tester.tap(find.widgetWithText(FilledButton, 'Enviar'));
}

void main() {
  testWidgets('streaming text grows as chunks arrive', (tester) async {
    await _pumpChat(tester);
    await _send(tester, 'Hola');
    await tester.pump();

    await tester.pump(_chunkDelay);
    expect(find.textContaining('Puedo ayudarte'), findsOneWidget);
    expect(find.text(_answer), findsNothing);

    await tester.pump(_chunkDelay);
    expect(
      find.textContaining('Puedo ayudarte con tus tareas'),
      findsOneWidget,
    );
    expect(find.text(_answer), findsNothing);

    await _settle(tester);
    expect(find.text(_answer), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Enviar'), findsOneWidget);
  });

  testWidgets('stop cancels the answer and keeps the text received', (
    tester,
  ) async {
    await _pumpChat(tester);
    await _send(tester, 'Hola');
    await tester.pump(_chunkDelay);

    await tester.tap(find.widgetWithText(FilledButton, 'Detener'));
    await _settle(tester);

    expect(find.textContaining('Puedo ayudarte'), findsOneWidget);
    expect(find.text(_answer), findsNothing);
    expect(find.text('Respuesta detenida.'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Enviar'), findsOneWidget);
  });

  testWidgets('citations are shown under the answer', (tester) async {
    await _pumpChat(tester);
    await _send(tester, 'Hola');
    await _settle(tester);

    expect(find.text('Fuentes'), findsOneWidget);
    expect(find.text('Plan semanal de tareas'), findsOneWidget);
    expect(find.text('Notas de la reunión del lunes'), findsOneWidget);
    expect(find.textContaining('Tokens: 412'), findsOneWidget);
  });

  testWidgets('tool confirmation continues the answer when confirmed', (
    tester,
  ) async {
    await _pumpChat(tester);
    await _send(tester, 'crear una tarea');
    await _settle(tester);

    expect(
      find.text('El asistente quiere ejecutar una acción'),
      findsOneWidget,
    );
    expect(
      find.text('Crear una tarea nueva en tu lista de pendientes.'),
      findsOneWidget,
    );

    await tester.tap(find.widgetWithText(FilledButton, 'Confirmar'));
    await tester.pump(_chunkDelay * 2);
    await _settle(tester);

    expect(find.text('Acción confirmada'), findsOneWidget);
    expect(
      find.textContaining('Listo, la tarea quedó creada.'),
      findsOneWidget,
    );
    expect(find.widgetWithText(FilledButton, 'Confirmar'), findsNothing);
  });

  testWidgets('tool confirmation continues the answer when rejected', (
    tester,
  ) async {
    await _pumpChat(tester);
    await _send(tester, 'crear una tarea');
    await _settle(tester);

    await tester.tap(find.widgetWithText(OutlinedButton, 'Cancelar'));
    await tester.pump(_chunkDelay * 2);
    await _settle(tester);

    expect(find.text('Acción cancelada'), findsOneWidget);
    expect(find.textContaining('Entendido, no creé la tarea.'), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, 'Cancelar'), findsNothing);
  });

  testWidgets('quota error shows a snack bar with its code', (tester) async {
    await _pumpChat(tester);
    await _send(tester, 'cuota');
    await _settle(tester);

    expect(
      find.textContaining('Alcanzaste el límite de consultas de tu plan.'),
      findsOneWidget,
    );
    expect(find.textContaining('BILLING.QUOTA.EXCEEDED'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Enviar'), findsOneWidget);
  });

  testWidgets('strings come from AssistantLocalizations in es', (tester) async {
    final l10n = lookupAssistantLocalizations(const Locale('es'));
    await _pumpChat(tester);

    expect(find.text(l10n.chatTitle), findsOneWidget);
    expect(find.text(l10n.send), findsOneWidget);
    expect(find.text(l10n.inputHint), findsOneWidget);
  });

  testWidgets('the same screen shows English strings when the locale is en', (
    tester,
  ) async {
    await _pumpChat(tester, locale: const Locale('en'));

    expect(find.text('Conversation'), findsOneWidget);
    expect(find.text('Send'), findsOneWidget);
    expect(find.text('Type your question'), findsOneWidget);
  });
  testWidgets('quota error is shown in English when the locale is en', (
    tester,
  ) async {
    await _pumpChat(tester, locale: const Locale('en'));
    await tester.enterText(find.byType(TextField), 'cuota');
    await tester.tap(find.widgetWithText(FilledButton, 'Send'));
    await _settle(tester);

    expect(
      find.textContaining("You have reached your plan's query limit."),
      findsOneWidget,
    );
  });

  testWidgets('without tasks:write the tool confirm button is hidden', (
    tester,
  ) async {
    await _pumpChat(tester, session: readerSession());
    await _send(tester, 'crear una tarea');
    await _settle(tester);

    expect(find.widgetWithText(OutlinedButton, 'Cancelar'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Confirmar'), findsNothing);
  });

  testWidgets('with tasks:write the tool confirm button is shown', (
    tester,
  ) async {
    await _pumpChat(tester);
    await _send(tester, 'crear una tarea');
    await _settle(tester);

    expect(find.widgetWithText(FilledButton, 'Confirmar'), findsOneWidget);
  });
}
