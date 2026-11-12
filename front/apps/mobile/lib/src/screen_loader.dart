import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

/// [ScreenLoader] of the mobile shell: a deferred page with the shared loading
/// view, and an error view whose text and retry label come from [AppLocalizations].
///
/// A caller can still pass its own [loading] or [errorBuilder].
Widget mobileScreenLoader({
  required Future<void> Function() loadLibrary,
  required Widget Function() builder,
  Widget? loading,
  Widget Function(Object error, VoidCallback retry)? errorBuilder,
}) => deferredPage(
  loadLibrary: loadLibrary,
  builder: builder,
  loading: loading ?? const LoadingView(),
  errorBuilder:
      errorBuilder ??
      (error, retry) => Builder(
        builder: (context) {
          final l10n = AppLocalizations.of(context);
          return ErrorView(
            message: l10n.errorFallback,
            retryLabel: l10n.actionRetry,
            onRetry: retry,
          );
        },
      ),
);
