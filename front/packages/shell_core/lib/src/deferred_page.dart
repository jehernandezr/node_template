import 'package:material_ui/material_ui.dart';

/// Builds a page whose library loads on demand. Passed to manifest route builders.
typedef ScreenLoader = Widget Function({
  required Future<void> Function() loadLibrary,
  required Widget Function() builder,
  Widget? loading,
  Widget Function(Object error, VoidCallback retry)? errorBuilder,
});

final Map<Future<void> Function(), Future<void>> _libraryLoads = {};

/// Loads a library once. A failed load is forgotten so it can be retried.
Future<void> _loadOnce(Future<void> Function() loadLibrary) {
  final existing = _libraryLoads[loadLibrary];
  if (existing != null) return existing;
  final future = loadLibrary();
  _libraryLoads[loadLibrary] = future;
  future.catchError((Object _) {
    _libraryLoads.remove(loadLibrary);
  });
  return future;
}

/// Forgets every cached library load, so the next [deferredPage] calls its
/// `loadLibrary` again.
///
/// A cached future belongs to the fake-async zone it was created in. In widget
/// tests, call this in `setUp` so a load from an earlier test is not reused.
@visibleForTesting
void resetDeferredPageCache() => _libraryLoads.clear();

/// Shows [loading] (or nothing) until [loadLibrary] completes, then [builder].
///
/// If the load fails, [errorBuilder] is shown instead; its `retry` callback loads
/// the library again. The default error view shows the error text and a Retry
/// button.
///
/// Each library loads once per app run, however many pages use it.
Widget deferredPage({
  required Future<void> Function() loadLibrary,
  required Widget Function() builder,
  Widget? loading,
  Widget Function(Object error, VoidCallback retry)? errorBuilder,
}) => _DeferredPage(
  loadLibrary: loadLibrary,
  builder: builder,
  loading: loading,
  errorBuilder: errorBuilder,
);

final class _DeferredPage extends StatefulWidget {
  const _DeferredPage({
    required this.loadLibrary,
    required this.builder,
    this.loading,
    this.errorBuilder,
  });

  final Future<void> Function() loadLibrary;
  final Widget Function() builder;
  final Widget? loading;
  final Widget Function(Object error, VoidCallback retry)? errorBuilder;

  @override
  State<_DeferredPage> createState() => _DeferredPageState();
}

class _DeferredPageState extends State<_DeferredPage> {
  late Future<void> _library = _loadOnce(widget.loadLibrary);

  @override
  void didUpdateWidget(covariant _DeferredPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.loadLibrary != widget.loadLibrary) {
      _library = _loadOnce(widget.loadLibrary);
    }
  }

  void _retry() {
    setState(() {
      _library = _loadOnce(widget.loadLibrary);
    });
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<void>(
    future: _library,
    builder: (context, snapshot) {
      if (snapshot.hasError) {
        final error = snapshot.error!;
        final errorBuilder = widget.errorBuilder;
        if (errorBuilder != null) return errorBuilder(error, _retry);
        return _DefaultLoadError(error: error, retry: _retry);
      }
      if (snapshot.connectionState != ConnectionState.done) {
        return widget.loading ?? const SizedBox.shrink();
      }
      return widget.builder();
    },
  );
}

final class _DefaultLoadError extends StatelessWidget {
  const _DefaultLoadError({required this.error, required this.retry});

  final Object error;
  final VoidCallback retry;

  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('$error', textAlign: TextAlign.center),
        TextButton(onPressed: retry, child: const Text('Retry')),
      ],
    ),
  );
}
