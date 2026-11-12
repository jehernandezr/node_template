import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';
/// Loads deferred screens for the web shell with its loading and error views.
///
/// Passed to `buildShellRouter` as `load`, so every microfrontend screen shows
/// the same loading indicator and, when its library fails, a localized error
/// with a retry button.
Widget loadScreen({
  required Future<void> Function() loadLibrary,
  required Widget Function() builder,
  Widget? loading,
  Widget Function(Object error, VoidCallback retry)? errorBuilder,
}) => deferredPage(
  loadLibrary: loadLibrary,
  builder: builder,
  loading: const LoadingView(),
  errorBuilder: errorBuilder ?? _loadError,
);

Widget _loadError(Object error, VoidCallback retry) => Builder(
  builder: (context) {
    final l10n = AppLocalizations.of(context);
    return ErrorView(
      message: l10n.errorFallback,
      retryLabel: l10n.actionRetry,
      onRetry: retry,
    );
  },
);
