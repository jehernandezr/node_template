import 'package:material_ui/material_ui.dart';

import '../state/async_value.dart';
import 'error_view.dart';
import 'loading_view.dart';

/// Shows an [AsyncValue]: [LoadingView] while loading, an
/// [ErrorView.fromException] on error (with the API code and trace id when
/// the error is an `ApiErrorException`) and [data] with the value.
///
/// ```dart
/// AsyncValueView<List<Task>>(
///   value: _tasks,
///   errorMessage: l10n.loadError,
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
  );
}
