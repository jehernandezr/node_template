import 'package:flutter/foundation.dart';

import 'async_value.dart';

/// Loads one value and keeps its [AsyncValue] state.
///
/// An answer that arrives after a newer [load] is dropped, and nothing
/// notifies after [dispose].
final class AsyncLoader<T> extends ChangeNotifier {
  /// Creates a loader that reads its value with [fetch]. It does not fetch
  /// until [load] is called.
  AsyncLoader(Future<T> Function() fetch) : _fetch = fetch;

  final Future<T> Function() _fetch;

  AsyncValue<T> _value = const AsyncValue.loading();
  int _requestId = 0;
  bool _disposed = false;

  /// Current state. Starts as [AsyncLoading].
  AsyncValue<T> get value => _value;

  /// Fetches again. The answer of an older call is dropped. With
  /// [keepCurrent] and data on screen, the data stays until the new one
  /// arrives instead of going back to loading.
  ///
  /// An Error from the fetch is a bug and escapes through this future.
  Future<void> load({bool keepCurrent = false}) async {
    if (_disposed) return;
    final id = ++_requestId;
    if (!(keepCurrent && _value is AsyncData<T>)) {
      _emit(AsyncValue<T>.loading());
    }
    final result = await AsyncValue.guard(_fetch);
    if (_disposed || id != _requestId) return;
    _emit(result);
  }

  /// Replaces the data (optimistic edits) and drops any fetch in flight.
  void setData(T data) {
    _requestId++;
    _emit(AsyncValue<T>.data(data));
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }

  void _emit(AsyncValue<T> next) {
    if (_disposed) return;
    _value = next;
    notifyListeners();
  }
}
