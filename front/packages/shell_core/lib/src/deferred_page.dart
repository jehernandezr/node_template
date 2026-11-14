import 'package:material_ui/material_ui.dart';

import 'deferred_library_loader.dart';

/// Builds a page whose library loads on demand. Passed to manifest route builders.
typedef ScreenLoader = Widget Function({
  required Future<void> Function() loadLibrary,
  required Widget Function() builder,
  Widget? loading,
  Widget Function(Object error, VoidCallback retry)? errorBuilder,
});

/// Holds the loader behind [deferredPage] so [resetDeferredPageCache] can
/// replace it.
final class _SharedLoader {
  DeferredLibraryLoader current = DeferredLibraryLoader();
}

final _shared = _SharedLoader();

/// Forgets every cached library load, so the next [deferredPage] calls its
/// `loadLibrary` again.
///
/// A cached future belongs to the fake-async zone it was created in. In widget
/// tests, call this in `setUp` so a load from an earlier test is not reused.
///
/// Superseded by [DeferredLibraryLoader].
@visibleForTesting
void resetDeferredPageCache() => _shared.current = DeferredLibraryLoader();

/// Shows [loading] (or nothing) until [loadLibrary] completes, then [builder].
///
/// If the load fails, [errorBuilder] is shown instead; its `retry` callback loads
/// the library again. Shells pass their own. The default error view shows the
/// localized `errorFallback` text and an `actionRetry` button from
/// [AppLocalizations] (only a retry icon when those texts are not in the tree);
/// it never shows the raw error.
///
/// Each library loads once per app run, however many pages use it.
///
/// Superseded by [DeferredLibraryLoader].
Widget deferredPage({
  required Future<void> Function() loadLibrary,
  required Widget Function() builder,
  Widget? loading,
  Widget Function(Object error, VoidCallback retry)? errorBuilder,
}) => _shared.current.page(
  loadLibrary: loadLibrary,
  builder: builder,
  loading: loading,
  errorBuilder: errorBuilder,
);
