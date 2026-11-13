import 'package:material_ui/material_ui.dart';

import 'error_view.dart';
import 'loading_view.dart';

/// State of an asynchronous value: loading, data or error.
sealed class AsyncValue<T> {
  const AsyncValue();

  /// The value is being loaded.
  const factory AsyncValue.loading() = AsyncLoading<T>;

  /// The value is available.
  const factory AsyncValue.data(T value) = AsyncData<T>;

  /// Loading failed with [error].
  const factory AsyncValue.error(Object error, [StackTrace? stackTrace]) =
      AsyncError<T>;

  /// State of [snapshot]: error, then data, then loading.
  factory AsyncValue.fromSnapshot(AsyncSnapshot<T> snapshot) {
    if (snapshot.hasError) {
      return AsyncValue.error(snapshot.error!, snapshot.stackTrace);
    }
    if (snapshot.hasData) return AsyncValue.data(snapshot.data as T);
    if (snapshot.connectionState == ConnectionState.done && null is T) {
      return AsyncValue.data(null as T);
    }
    return AsyncValue<T>.loading();
  }

  /// Runs [load] and returns its result as data, or the error it threw.
  static Future<AsyncValue<T>> guard<T>(Future<T> Function() load) async {
    try {
      return AsyncValue.data(await load());
    } catch (error, stackTrace) {
      return AsyncValue.error(error, stackTrace);
    }
  }

  /// Whether this is [AsyncLoading].
  bool get isLoading => this is AsyncLoading<T>;

  /// The value when this is [AsyncData], otherwise null.
  T? get valueOrNull => switch (this) {
    AsyncData<T>(:final value) => value,
    _ => null,
  };
}

/// [AsyncValue] while loading.
final class AsyncLoading<T> extends AsyncValue<T> {
  /// Creates the loading state.
  const AsyncLoading();
}

/// [AsyncValue] with a [value].
final class AsyncData<T> extends AsyncValue<T> {
  /// Creates the data state.
  const AsyncData(this.value);

  /// The loaded value.
  final T value;
}

/// [AsyncValue] after a failure.
final class AsyncError<T> extends AsyncValue<T> {
  /// Creates the error state.
  const AsyncError(this.error, [this.stackTrace]);

  /// What was thrown.
  final Object error;

  /// Where it was thrown, when known.
  final StackTrace? stackTrace;
}

/// Shows an [AsyncValue]: [LoadingView] while loading, an
/// [ErrorView.fromException] on error (with the API code and trace id when
/// the error is an `ApiErrorException`) and [data] with the value.
///
/// ```dart
/// AsyncValueView<List<Task>>(
///   value: _tasks,
///   errorMessage: l10n.loadError,
///   retryLabel: l10n.retry,
///   onRetry: _reload,
///   data: (tasks) => TaskList(tasks),
/// )
/// ```
class AsyncValueView<T> extends StatelessWidget {
  /// Creates a view of [value].
  const AsyncValueView({
    super.key,
    required this.value,
    required this.data,
    required this.errorMessage,
    this.onRetry,
    this.loading,
    this.retryLabel,
    this.codeLabel,
    this.traceIdLabel,
  });

  /// State to show.
  final AsyncValue<T> value;

  /// Builds the content once the value is available.
  final Widget Function(T value) data;

  /// Localized message shown on error. Never the raw error text.
  final String errorMessage;

  /// Called by the retry button of the error view; no button when null.
  final VoidCallback? onRetry;

  /// Shown while loading. Defaults to [LoadingView].
  final Widget? loading;

  /// Label of the retry button. Defaults to the localized [ErrorView] label.
  final String? retryLabel;

  /// Prefix of the error code line. Defaults to the localized [ErrorView] label.
  final String? codeLabel;

  /// Prefix of the trace id line. Defaults to the localized [ErrorView] label.
  final String? traceIdLabel;

  @override
  Widget build(BuildContext context) => switch (value) {
    AsyncLoading<T>() => loading ?? const LoadingView(),
    AsyncData<T>(value: final current) => data(current),
    AsyncError<T>(:final error) => _error(error),
  };

  Widget _error(Object error) => ErrorView.fromException(
    error,
    fallbackMessage: errorMessage,
    onRetry: onRetry,
    retryLabel: retryLabel,
    codeLabel: codeLabel,
    traceIdLabel: traceIdLabel,
  );
}
