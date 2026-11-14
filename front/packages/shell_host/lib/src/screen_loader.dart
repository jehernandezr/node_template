import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

/// [ScreenLoader] of the shells: a deferred page with the shared loading view
/// and, when the library fails to load, a localized error with a retry.
///
/// A screen can still pass its own `loading` or `errorBuilder`.
Widget shellScreenLoader({
  required Future<void> Function() loadLibrary,
  required Widget Function() builder,
  Widget? loading,
  Widget Function(Object error, VoidCallback retry)? errorBuilder,
}) => deferredPage(
  loadLibrary: loadLibrary,
  builder: builder,
  loading: loading ?? const LoadingView(),
  errorBuilder: errorBuilder ?? _loadError,
);

Widget _loadError(Object error, VoidCallback retry) => Builder(
  builder: (context) => ErrorView(
    message: AppLocalizations.of(context).errorFallback,
    onRetry: retry,
  ),
);
