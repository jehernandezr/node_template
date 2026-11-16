import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_assistant/src/screens/widgets/chat_bubble.dart';
import 'package:mf_assistant/src/shared/enums/assistant_role.dart';
import 'package:mf_assistant/src/shared/types/assistant_types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';

import '../../utils/assistant_test_app.dart';

const List<Citation> _citations = [
  Citation(title: 'Plan semanal de tareas', sourceId: 'doc-101'),
];

const TokenUsage _usage = TokenUsage(input: 412, output: 48);

Future<List<bool>> _pump(
  WidgetTester tester,
  ChatMessage message, {
  UserSession? session,
  Locale locale = const Locale('es'),
}) async {
  final decisions = <bool>[];
  await tester.pumpWidget(
    assistantTestApp(
      Scaffold(
        body: SingleChildScrollView(
          child: ChatBubble(message: message, onToolDecision: decisions.add),
        ),
      ),
      session: session,
      locale: locale,
    ),
  );
  await tester.pumpAndSettle();
  return decisions;
}

ChatMessage _assistant({
  String text = '',
  bool isStreaming = false,
  bool wasStopped = false,
  TokenUsage? usage,
  List<Citation> citations = const [],
  ToolConfirmationRequest? toolRequest,
  bool? toolApproved,
}) => ChatMessage(
  id: 'a1',
  role: AssistantRole.assistant,
  text: text,
  isStreaming: isStreaming,
  wasStopped: wasStopped,
  usage: usage,
  citations: citations,
  toolRequest: toolRequest,
  toolApproved: toolApproved,
);

ToolConfirmationRequest _request() => ToolConfirmationRequest(
  toolName: 'crear_tarea',
  summary: 'Crear una tarea nueva en tu lista de pendientes.',
);

void main() {
  group(ChatBubble, () {
    testWidgets('el mensaje del usuario va alineado al final', (tester) async {
      await _pump(
        tester,
        const ChatMessage(
          id: 'u1',
          role: AssistantRole.user,
          text: 'Qué tengo hoy',
        ),
      );

      expect(find.text('Qué tengo hoy'), findsOneWidget);
      final align = tester.widget<Align>(
        find
            .ancestor(
              of: find.text('Qué tengo hoy'),
              matching: find.byType(Align),
            )
            .first,
      );
      expect(align.alignment, AlignmentDirectional.centerEnd);
    });

    testWidgets('una respuesta vacía en streaming muestra que escribe', (
      tester,
    ) async {
      await _pump(tester, _assistant(isStreaming: true));
      expect(find.text('Escribiendo...'), findsOneWidget);
    });

    testWidgets('una respuesta detenida lo indica', (tester) async {
      await _pump(tester, _assistant(text: 'Puedo', wasStopped: true));
      expect(find.text('Respuesta detenida.'), findsOneWidget);
      expect(find.text('Puedo'), findsOneWidget);
    });

    testWidgets('el uso se oculta mientras la respuesta llega', (tester) async {
      await _pump(
        tester,
        _assistant(text: 'Hola', usage: _usage, isStreaming: true),
      );
      expect(find.textContaining('Tokens'), findsNothing);
    });

    testWidgets('el uso se muestra cuando la respuesta terminó', (
      tester,
    ) async {
      await _pump(tester, _assistant(text: 'Hola', usage: _usage));
      expect(find.textContaining('Tokens: 412'), findsOneWidget);
    });

    testWidgets('confirmar la herramienta informa la decisión true', (
      tester,
    ) async {
      final decisions = await _pump(
        tester,
        _assistant(toolRequest: _request()),
      );

      await tester.tap(find.widgetWithText(FilledButton, 'Confirmar'));
      await tester.pump();

      expect(decisions, [true]);
    });

    testWidgets('cancelar la herramienta informa la decisión false', (
      tester,
    ) async {
      final decisions = await _pump(
        tester,
        _assistant(toolRequest: _request()),
      );

      await tester.tap(find.widgetWithText(OutlinedButton, 'Cancelar'));
      await tester.pump();

      expect(decisions, [false]);
    });

    testWidgets('sin permiso de tareas no aparece confirmar', (tester) async {
      await _pump(
        tester,
        _assistant(toolRequest: _request()),
        session: readerSession(),
      );
      expect(find.text('Confirmar'), findsNothing);
      expect(find.text('Cancelar'), findsOneWidget);
    });

    testWidgets('una herramienta aprobada muestra el resultado sin botones', (
      tester,
    ) async {
      await _pump(
        tester,
        _assistant(toolRequest: _request(), toolApproved: true),
      );
      expect(find.text('Acción confirmada'), findsOneWidget);
      expect(find.byType(FilledButton), findsNothing);
      expect(find.byType(OutlinedButton), findsNothing);
    });

    testWidgets('con locale en los textos salen en inglés', (tester) async {
      await _pump(
        tester,
        _assistant(
          text: 'Hola',
          usage: _usage,
          wasStopped: true,
          toolRequest: _request(),
        ),
        locale: const Locale('en'),
      );
      expect(find.text('Answer stopped.'), findsOneWidget);
      expect(find.text('Confirm'), findsOneWidget);
      expect(find.text('Cancel'), findsOneWidget);
      expect(find.text('Sources'), findsNothing);
      expect(find.textContaining('Tokens: 412 input'), findsOneWidget);
    });

    testWidgets('la burbuja del asistente cumple las guías de accesibilidad', (
      tester,
    ) async {
      await _pump(
        tester,
        _assistant(
          text: 'Puedo ayudarte con tus tareas.',
          citations: _citations,
          usage: _usage,
          toolRequest: _request(),
        ),
      );
      await expectAccessible(tester);
    });
  });
}
