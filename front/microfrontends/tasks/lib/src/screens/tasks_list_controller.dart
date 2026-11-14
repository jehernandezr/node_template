import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:ui/ui.dart';

import '../data/tasks_repository.dart';
import '../shared/enums/task_status.dart';
import '../shared/types/task.dart';

/// State of the tasks list: status filter, search, cursor pagination and the
/// answer that belongs to the latest request.
///
/// The screen draws it and forwards the user's input; the rules live here so
/// they can be tested without widgets.
final class TasksListController extends ChangeNotifier {
  /// Controller over [repository]. Call [start] once.
  TasksListController(this._repository, {this.searchDelay = searchDebounce});

  /// Wait after the last keystroke before searching.
  static const Duration searchDebounce = Duration(milliseconds: 300);

  final TasksRepository _repository;

  /// Wait applied by [search].
  final Duration searchDelay;

  StreamSubscription<void>? _changes;
  Timer? _debounce;
  bool _disposed = false;

  /// Incremented by every load that replaces the list, so the answer of an
  /// older request (a slower search, a previous filter) is dropped.
  int _requestId = 0;

  TaskStatus? _status;
  String _query = '';
  AsyncValue<List<Task>> _items = const AsyncValue.loading();
  String? _nextCursor;
  bool _loadingMore = false;

  /// Status filter, or null for every status.
  TaskStatus? get status => _status;

  /// Trimmed search text; empty when not searching.
  String get query => _query;

  /// Whether the list shows search results.
  bool get searching => _query.isNotEmpty;

  /// Tasks of the current filter and search.
  AsyncValue<List<Task>> get items => _items;

  /// Whether another page can be appended.
  bool get hasMore => _nextCursor != null;

  /// Whether the next page is loading.
  bool get loadingMore => _loadingMore;

  /// Loads the first page and reloads whenever the repository changes.
  void start() {
    _changes ??= _repository.changes().listen((_) => reload());
    unawaited(reload());
  }

  /// Loads the first page, or the search results.
  Future<void> reload() async {
    final request = ++_requestId;
    _items = const AsyncValue.loading();
    _loadingMore = false;
    _notify();
    String? next;
    final result = await AsyncValue.guard<List<Task>>(() async {
      if (searching) return _repository.search(_query, status: _status);
      final page = await _repository.list(status: _status);
      next = page.nextCursor;
      return page.items;
    });
    if (_disposed || request != _requestId) return;
    _items = result;
    _nextCursor = next;
    _notify();
  }

  /// Appends the next page. A failure leaves the list as it was and is
  /// rethrown for the screen to report.
  Future<void> loadMore() async {
    final cursor = _nextCursor;
    final current = _items.valueOrNull;
    if (cursor == null || current == null || _loadingMore) return;
    final request = _requestId;
    _loadingMore = true;
    _notify();
    try {
      final page = await _repository.list(status: _status, cursor: cursor);
      if (_disposed || request != _requestId) return;
      _items = AsyncValue.data([...current, ...page.items]);
      _nextCursor = page.nextCursor;
    } finally {
      if (!_disposed && request == _requestId) {
        _loadingMore = false;
        _notify();
      }
    }
  }

  /// Shows only tasks in [status], or every task when null.
  void filter(TaskStatus? status) {
    if (status == _status) return;
    _status = status;
    unawaited(reload());
  }

  /// Searches [text] once the user stops typing for [searchDelay].
  void search(String text) {
    final query = text.trim();
    _debounce?.cancel();
    if (query == _query) return;
    _debounce = Timer(searchDelay, () {
      _query = query;
      unawaited(reload());
    });
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _debounce?.cancel();
    unawaited(_changes?.cancel());
    super.dispose();
  }
}
