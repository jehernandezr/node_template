import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/assistant_repository.dart';
import '../shared/types/assistant_types.dart';

/// State and actions of the conversation list.
final class AssistantListController extends ChangeNotifier {
  AssistantListController(AssistantRepository repository)
    : _repository = repository,
      _loader = AsyncLoader(repository.listConversations),
      _runner = ActionRunner() {
    _loader.addListener(notifyListeners);
    _runner.addListener(notifyListeners);
  }

  final AssistantRepository _repository;
  final AsyncLoader<List<Conversation>> _loader;
  final ActionRunner _runner;

  /// Conversations of the user, loading or failed.
  AsyncValue<List<Conversation>> get conversations => _loader.value;

  /// Whether a conversation is being created.
  bool get isCreating => _runner.isRunning;

  /// Loads the list. Call it again to retry.
  Future<void> start() => _loader.load();

  /// Creates an empty conversation. A call made while another one runs is
  /// skipped.
  Future<ActionResult<Conversation>> create() =>
      _runner.run(_repository.createConversation);

  @override
  void dispose() {
    _loader.dispose();
    _runner.dispose();
    super.dispose();
  }
}
