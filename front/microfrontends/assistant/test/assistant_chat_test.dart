import 'package:flutter_test/flutter_test.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_assistant/src/data/fake_assistant_repository.dart';
import 'package:mf_assistant/src/l10n/generated/assistant_localizations.dart';
import 'package:mf_assistant/src/presentation/assistant_chat_screen.dart';
import 'package:ui/ui.dart';

const _answer = 'Puedo ayudarte con tus tareas pendientes.';
const _chunkDelay = Duration(milliseconds: 50);

Future<void> _pumpChat(WidgetTester tester, {Locale locale = const Locale('es')}) async {
  await tester.pumpWidget(
    MaterialApp(
      locale: locale,
      supportedLocales: const [Locale('es'), Locale('en')],
      localizationsDelegates: [
        ...GlobalMaterialLocalizations.delegates,
        AppLocalizations.delegate,
        AssistantLocalizations.delegate,
      ],
      home: AssistantChatScreen(
        conversationId: 'c1',
        repository: FakeAssistantRepository(chunkDelay: _chunkDelay),
      ),
    ),
  );
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
    expect(find.textContaining('Puedo ayudarte con tus tareas'), findsOneWidget);
    expect(find.text(_answer), findsNothing);

    await tester.pumpAndSettle();
    expect(find.text(_answer), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Enviar'), findsOneWidget);
  });

  testWidgets('stop cancels the answer and keeps the text received', (tester) async {
    await _pumpChat(tester);
    await _send(tester, 'Hola');
    await tester.pump(_chunkDelay);

    await tester.tap(find.widgetWithText(FilledButton, 'Detener'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Puedo ayudarte'), findsOneWidget);
    expect(find.text(_answer), findsNothing);
    expect(find.text('Respuesta detenida.'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Enviar'), findsOneWidget);
  });

  testWidgets('citations are shown under the answer', (tester) async {
    await _pumpChat(tester);
    await _send(tester, 'Hola');
    await tester.pumpAndSettle();

    expect(find.text('Fuentes'), findsOneWidget);
    expect(find.text('Plan semanal de tareas'), findsOneWidget);
    expect(find.text('Notas de la reunión del lunes'), findsOneWidget);
    expect(find.textContaining('Tokens: 412'), findsOneWidget);
  });

  testWidgets('tool confirmation continues the answer when confirmed', (tester) async {
    await _pumpChat(tester);
    await _send(tester, 'crear una tarea');
    await tester.pumpAndSettle();

    expect(find.text('El asistente quiere ejecutar una acción'), findsOneWidget);
    expect(
      find.text('Crear una tarea nueva en tu lista de pendientes.'),
      findsOneWidget,
    );

    await tester.tap(find.widgetWithText(FilledButton, 'Confirmar'));
    await tester.pump(_chunkDelay * 2);
    await tester.pumpAndSettle();

    expect(find.text('Acción confirmada'), findsOneWidget);
    expect(find.textContaining('Listo, la tarea quedó creada.'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Confirmar'), findsNothing);
  });

  testWidgets('tool confirmation continues the answer when rejected', (tester) async {
    await _pumpChat(tester);
    await _send(tester, 'crear una tarea');
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(OutlinedButton, 'Cancelar'));
    await tester.pump(_chunkDelay * 2);
    await tester.pumpAndSettle();

    expect(find.text('Acción cancelada'), findsOneWidget);
    expect(find.textContaining('Entendido, no creé la tarea.'), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, 'Cancelar'), findsNothing);
  });

  testWidgets('quota error shows the code and trace id via ErrorView', (tester) async {
    await _pumpChat(tester);
    await _send(tester, 'cuota');
    await tester.pumpAndSettle();

    final view = tester.widget<ErrorView>(find.byType(ErrorView));
    expect(view.code, 'BILLING.QUOTA.EXCEEDED');
    expect(view.traceId, 'trace-quota-0001');
    expect(view.message, 'Alcanzaste el límite de consultas de tu plan.');
    expect(find.textContaining('BILLING.QUOTA.EXCEEDED'), findsOneWidget);
    expect(find.textContaining('trace-quota-0001'), findsOneWidget);
    expect(find.widgetWithText(FilledButton, 'Enviar'), findsOneWidget);
  });

  testWidgets('strings come from AssistantLocalizations in es', (tester) async {
    final l10n = lookupAssistantLocalizations(const Locale('es'));
    await _pumpChat(tester);

    expect(find.text(l10n.chatTitle), findsOneWidget);
    expect(find.text(l10n.send), findsOneWidget);
    expect(find.text(l10n.inputHint), findsOneWidget);
  });

  testWidgets('the same screen shows English strings when the locale is en', (tester) async {
    await _pumpChat(tester, locale: const Locale('en'));

    expect(find.text('Conversation'), findsOneWidget);
    expect(find.text('Send'), findsOneWidget);
    expect(find.text('Type your question'), findsOneWidget);
  });
  testWidgets('quota error labels come from AppLocalizations in en', (tester) async {
    await _pumpChat(tester, locale: const Locale('en'));
    await tester.enterText(find.byType(TextField), 'cuota');
    await tester.tap(find.widgetWithText(FilledButton, 'Send'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Code: BILLING.QUOTA.EXCEEDED'), findsOneWidget);
    expect(find.textContaining('Trace ID: trace-quota-0001'), findsOneWidget);
    expect(find.text('Retry'), findsNothing);
  });
}
