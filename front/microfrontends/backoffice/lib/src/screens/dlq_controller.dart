import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/backoffice_repository.dart';
import '../shared/types/backoffice_types.dart';

/// State of the dead-letter queues: the list of queues and, when one is
/// selected, its messages.
final class DlqController extends ChangeNotifier {
  /// Controller over [repository], starting on [queue] when given.
  DlqController(BackofficeRepository repository, {String? queue})
    : _repository = repository,
      _queue = queue,
      _queuesLoader = AsyncLoader<List<DeadLetterQueue>>(
        repository.deadLetterQueues,
      ),
      _messagesLoader = queue == null
          ? null
          : AsyncLoader<List<DeadLetterMessage>>(
              () => repository.deadLetterMessages(queue),
            ),
      _runner = ActionRunner() {
    _queuesLoader.addListener(notifyListeners);
    _messagesLoader?.addListener(notifyListeners);
    _runner.addListener(notifyListeners);
  }

  final BackofficeRepository _repository;
  final String? _queue;
  final AsyncLoader<List<DeadLetterQueue>> _queuesLoader;
  final AsyncLoader<List<DeadLetterMessage>>? _messagesLoader;
  final ActionRunner _runner;

  /// The selected queue, or null when only the queues are shown.
  String? get queue => _queue;

  /// Queues with their counts.
  AsyncValue<List<DeadLetterQueue>> get queues => _queuesLoader.value;

  /// Messages of [queue]; null when there is no selected queue.
  AsyncValue<List<DeadLetterMessage>>? get messages => _messagesLoader?.value;

  /// Whether a redrive is running.
  bool get isBusy => _runner.isRunning;

  /// Loads the queues and, when a queue is selected, its messages.
  Future<void> start() => _loadAll();

  /// Reloads only the queues; the retry of the queue list.
  Future<void> reloadQueues() => _queuesLoader.load();

  /// Reloads only the messages of [queue]; the retry of the message list.
  Future<void> reloadMessages() =>
      _messagesLoader?.load() ?? Future<void>.value();

  /// Moves every message of [queue] back to its source queue and, on success,
  /// reloads the queues and the messages. Returns how many moved, or
  /// [ActionSkipped] when there is no selected queue.
  ///
  /// Reloads keep the current lists on screen, so the spinner does not replace the rows that were just redriven.
  Future<ActionResult<int>> redrive() async {
    final selected = _queue;
    if (selected == null) return const ActionSkipped<int>();
    final result = await _runner.run(() => _repository.redrive(selected));
    if (result is ActionSucceeded<int>) await _loadAll(keepCurrent: true);
    return result;
  }

  Future<void> _loadAll({bool keepCurrent = false}) async {
    final messages = _messagesLoader;
    await Future.wait([
      _queuesLoader.load(keepCurrent: keepCurrent),
      if (messages != null) messages.load(keepCurrent: keepCurrent),
    ]);
  }

  @override
  void dispose() {
    _queuesLoader.dispose();
    _messagesLoader?.dispose();
    _runner.dispose();
    super.dispose();
  }
}
