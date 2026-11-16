import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';
import 'package:mf_assistant/src/screens/widgets/chat_message_list.dart';
import 'package:mf_assistant/src/shared/enums/assistant_role.dart';
import 'package:mf_assistant/src/shared/types/assistant_types.dart';

import '../../utils/assistant_test_app.dart';

List<ChatMessage> _messages(int count, {String? lastText}) => [
  for (var i = 0; i < count; i++)
    ChatMessage(
      id: 'm$i',
      role: i.isEven ? AssistantRole.user : AssistantRole.assistant,
      text: i == count - 1 && lastText != null ? lastText : 'Mensaje $i',
    ),
];

Future<void> _mount(WidgetTester tester, List<ChatMessage> messages) async {
  await tester.pumpWidget(
    assistantTestApp(
      Scaffold(
        body: ChatMessageList(messages: messages, onToolDecision: (_, _) {}),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

ScrollPosition _position(WidgetTester tester) =>
    tester.state<ScrollableState>(find.byType(Scrollable)).position;

void main() {
  group(ChatMessageList, () {
    testWidgets('al montar queda al final de la conversación', (tester) async {
      await _mount(tester, _messages(40));

      final position = _position(tester);
      expect(position.maxScrollExtent, greaterThan(0));
      expect(position.pixels, position.maxScrollExtent);
    });

    testWidgets('si el usuario subió a leer, la lista no se mueve', (
      tester,
    ) async {
      await _mount(tester, _messages(40));
      await tester.drag(find.byType(ListView), const Offset(0, 400));
      await tester.pumpAndSettle();
      final before = _position(tester).pixels;

      await _mount(tester, _messages(40, lastText: 'palabra ' * 200));

      expect(_position(tester).pixels, before);
    });

    testWidgets('si estaba al final y llega texto, sigue al final', (
      tester,
    ) async {
      await _mount(tester, _messages(40));

      await _mount(tester, _messages(40, lastText: 'palabra ' * 200));

      final position = _position(tester);
      expect(position.pixels, position.maxScrollExtent);
    });

    testWidgets('si el usuario subió y se envía un mensaje, salta al final', (
      tester,
    ) async {
      await _mount(tester, _messages(40));
      await tester.drag(find.byType(ListView), const Offset(0, 400));
      await tester.pumpAndSettle();

      await _mount(tester, _messages(42));

      final position = _position(tester);
      expect(position.pixels, position.maxScrollExtent);
    });
  });
}
