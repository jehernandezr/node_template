import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';

/// Builds a page whose library loads on demand. Passed to manifest route builders.
typedef ScreenLoader = Widget Function({
  required Future<void> Function() loadLibrary,
  required Widget Function() builder,
  Widget? loading,
  Widget Function(Object error, VoidCallback retry)? errorBuilder,
});

/// Loads deferred libraries once per instance and builds the page that waits
/// for them. The cache lives in the instance, so tests and shells that create
/// their own loader never share state.
final class DeferredLibraryLoader {
  /// [loading] and [errorBuilder] are the shell's defaults for pages that do
  /// not bring their own.
  DeferredLibraryLoader({this.loading, this.errorBuilder});

  /// Shown while a library loads, unless the page brings its own.
  final Widget? loading;

  /// Shown when a library fails to load, unless the page brings its own.
  final Widget Function(Object error, VoidCallback retry)? errorBuilder;

  final Map<Future<void> Function(), Future<void>> _loads = {};

  /// Loads a library once per instance. A failed load is forgotten so it can
  /// be retried.
  Future<void> load(Future<void> Function() loadLibrary) {
    final existing = _loads[loadLibrary];
    if (existing != null) return existing;
    final future = loadLibrary();
    _loads[loadLibrary] = future;
    // The failure stays on [future] for the callers that await it; this only
    // forgets it so the next request starts a new load.
    future.catchError((Object _) {
      if (identical(_loads[loadLibrary], future)) _loads.remove(loadLibrary);
    });
    return future;
  }

  /// A page that shows [loading] until the library loads, then [builder].
  /// Matches `ScreenLoader`, so `loader.page` can be passed where one is
  /// expected.
  ///
  /// If the load fails, the error builder is shown; its retry callback loads
  /// the library again. The default error view shows the localized
  /// errorFallback text and an actionRetry button and never shows the raw
  /// error.
  Widget page({
    required Future<void> Function() loadLibrary,
    required Widget Function() builder,
    Widget? loading,
    Widget Function(Object error, VoidCallback retry)? errorBuilder,
  }) => _DeferredPage(
    loader: this,
    loadLibrary: loadLibrary,
    builder: builder,
    loading: loading ?? this.loading,
    errorBuilder: errorBuilder ?? this.errorBuilder,
  );
}

final class _DeferredPage extends StatefulWidget {
  const _DeferredPage({
    required this.loader,
    required this.loadLibrary,
    required this.builder,
    this.loading,
    this.errorBuilder,
  });

  final DeferredLibraryLoader loader;
  final Future<void> Function() loadLibrary;
  final Widget Function() builder;
  final Widget? loading;
  final Widget Function(Object error, VoidCallback retry)? errorBuilder;

  @override
  State<_DeferredPage> createState() => _DeferredPageState();
}

class _DeferredPageState extends State<_DeferredPage> {
  late Future<void> _library = widget.loader.load(widget.loadLibrary);

  @override
  void didUpdateWidget(covariant _DeferredPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.loadLibrary != widget.loadLibrary ||
        oldWidget.loader != widget.loader) {
      _library = widget.loader.load(widget.loadLibrary);
    }
  }

  void _retry() {
    setState(() {
      _library = widget.loader.load(widget.loadLibrary);
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
        return _DefaultLoadError(retry: _retry);
      }
      if (snapshot.connectionState != ConnectionState.done) {
        return widget.loading ?? const SizedBox.shrink();
      }
      return widget.builder();
    },
  );
}

final class _DefaultLoadError extends StatelessWidget {
  const _DefaultLoadError({required this.retry});

  final VoidCallback retry;

  @override
  Widget build(BuildContext context) {
    final l10n = Localizations.of<AppLocalizations>(context, AppLocalizations);
    if (l10n == null) {
      return Center(
        child: TextButton(onPressed: retry, child: const Icon(Icons.refresh)),
      );
    }
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(l10n.errorFallback, textAlign: TextAlign.center),
          TextButton(onPressed: retry, child: Text(l10n.actionRetry)),
        ],
      ),
    );
  }
}
