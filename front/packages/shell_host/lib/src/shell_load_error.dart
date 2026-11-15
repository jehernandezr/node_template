import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

/// Localized error of a deferred library that failed to load, with a retry.
class ShellLoadError extends StatelessWidget {
  const ShellLoadError({super.key, required this.retry});

  /// Matches `DeferredLibraryLoader.errorBuilder`; the raw error is never
  /// shown.
  static Widget builder(Object error, VoidCallback retry) =>
      ShellLoadError(retry: retry);

  final VoidCallback retry;

  @override
  Widget build(BuildContext context) => ErrorView(
    message: AppLocalizations.of(context).errorFallback,
    onRetry: retry,
  );
}
