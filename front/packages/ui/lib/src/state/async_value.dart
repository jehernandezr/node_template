import 'package:material_ui/material_ui.dart';

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

  /// Runs [load] and returns its result as data. An [Exception] becomes
  /// [AsyncError]; an [Error] is a bug and escapes.
  static Future<AsyncValue<T>> guard<T>(Future<T> Function() load) async {
    try {
      return AsyncValue.data(await load());
    } on Exception catch (error, stackTrace) {
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

  /// Exhaustive fold, so a screen cannot forget a case.
  R when<R>({
    required R Function() loading,
    required R Function(T value) data,
    required R Function(Object error) error,
  }) => switch (this) {
    AsyncLoading<T>() => loading(),
    AsyncData<T>(value: final current) => data(current),
    AsyncError<T>(error: final failure) => error(failure),
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
