import 'package:flutter_test/flutter_test.dart';
import 'package:mf_assistant/src/data/assistant_repository.dart';
import 'package:mf_assistant/src/presentation/assistant_screens.dart';
import 'package:shell_core/shell_core.dart';

MicrofrontendScope _scope() => MicrofrontendScope(
  DefaultShellServices(
    session: UserSession.anonymous(),
    eventBus: ShellEventBus(),
  ),
);

void main() {
  test('a fresh scope has no conversations from another scope', () async {
    final first = _scope().get<AssistantRepository>(createAssistantRepository);
    await first.createConversation();
    expect(await first.listConversations(), hasLength(3));

    final second = _scope().get<AssistantRepository>(createAssistantRepository);
    final conversations = await second.listConversations();
    expect(conversations.map((c) => c.id), ['c1', 'c2']);
  });

  test('one scope returns the same repository for the same type', () {
    final scope = _scope();
    final first = scope.get<AssistantRepository>(createAssistantRepository);
    final again = scope.get<AssistantRepository>(createAssistantRepository);
    expect(identical(first, again), isTrue);
  });
}
