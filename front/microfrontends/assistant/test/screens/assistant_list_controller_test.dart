import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mf_assistant/src/data/fake_assistant_repository.dart';
import 'package:mf_assistant/src/screens/assistant_list_controller.dart';
import 'package:mf_assistant/src/shared/enums/assistant_operation.dart';
import 'package:mf_assistant/src/shared/types/assistant_types.dart';
import 'package:shell_core/shell_core.dart';
import 'package:test_utils/test_utils.dart';
import 'package:ui/ui.dart';

/// Repository whose creation waits for a completer the test controls.
base class _SlowCreate extends FakeAssistantRepository {
  _SlowCreate(this._creation);

  final Completer<Conversation> _creation;

  @override
  Future<Conversation> createConversation() => _creation.future;
}

void main() {
  group('AssistantListController', () {
    test('loads the conversations', () async {
      final controller = AssistantListController(
        FakeAssistantRepository(behavior: DemoBehavior()),
      );
      addTearDown(controller.dispose);
      expect(controller.conversations.isLoading, isTrue);

      await controller.start();

      expect(controller.conversations, isA<AsyncData<List<Conversation>>>());
      expect(controller.conversations.valueOrNull!.map((c) => c.id), [
        'c1',
        'c2',
      ]);
    });

    test('a failed load gives AsyncError and a retry recovers', () async {
      final behavior = DemoBehavior()
        ..failNext(
          const FakeFailure(),
          operation: AssistantOperation.listConversations,
        );
      final controller = AssistantListController(
        FakeAssistantRepository(behavior: behavior),
      );
      addTearDown(controller.dispose);

      await controller.start();
      expect(controller.conversations, isA<AsyncError<List<Conversation>>>());

      await controller.start();
      expect(controller.conversations, isA<AsyncData<List<Conversation>>>());
    });

    test('create returns the new conversation and clears isCreating', () async {
      final controller = AssistantListController(
        FakeAssistantRepository(behavior: DemoBehavior()),
      );
      addTearDown(controller.dispose);

      final result = await controller.create();

      expect(result, isA<ActionSucceeded<Conversation>>());
      expect((result as ActionSucceeded<Conversation>).value.id, 'c3');
      expect(controller.isCreating, isFalse);
    });

    test('a failed create gives ActionFailed', () async {
      final behavior = DemoBehavior()
        ..failNext(
          const FakeFailure(),
          operation: AssistantOperation.createConversation,
        );
      final controller = AssistantListController(
        FakeAssistantRepository(behavior: behavior),
      );
      addTearDown(controller.dispose);

      final result = await controller.create();

      expect(result, isA<ActionFailed<Conversation>>());
      expect(controller.isCreating, isFalse);
    });

    test('a create made while another runs is skipped', () async {
      final creation = Completer<Conversation>();
      final controller = AssistantListController(_SlowCreate(creation));
      addTearDown(controller.dispose);

      final first = controller.create();
      final second = controller.create();
      expect(controller.isCreating, isTrue);

      creation.complete(const Conversation(id: 'slow', title: 'x'));
      final results = await Future.wait([first, second]);

      expect(results[0], isA<ActionSucceeded<Conversation>>());
      expect(results[1], isA<ActionSkipped<Conversation>>());
    });

    test('nothing is notified after dispose', () async {
      final controller = AssistantListController(
        FakeAssistantRepository(behavior: DemoBehavior()),
      );
      var notifications = 0;
      controller.addListener(() => notifications++);

      unawaited(controller.start());
      controller.dispose();
      final afterDispose = notifications;

      await pumpEventQueue();
      expect(notifications, afterDispose);
    });
  });
}
