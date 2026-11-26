import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:tokens/tokens.dart';

import 'app_button.dart';

/// Error message with the stable error [code] and [traceId] for support.
///
/// The code and trace id are selectable so users can copy them into a
/// support request. The retry button appears only when [onRetry] is set, and
/// the message is announced to screen readers as it appears.
///
/// The labels come from [AppLocalizations] (`errorCodeLine`,
/// `errorTraceIdLine` and `actionRetry`), so the app must provide it.
class ErrorView extends StatelessWidget {
  /// Creates an error view showing a human [message].
  const ErrorView({
    super.key,
    required this.message,
    this.code,
    this.traceId,
    this.onRetry,
  }) : _error = null;

  /// Creates an error view from [details], as an `ErrorPresenter` describes
  /// them.
  ErrorView.details(ErrorDetails details, {super.key, this.onRetry})
    : message = details.message,
      code = details.code,
      traceId = details.traceId,
      _error = null;

  /// Creates an error view from any [error]. The code and trace id of an API
  /// error are shown; the text is always [fallbackMessage], never the
  /// server's own.
  const ErrorView.fromException(
    Object error, {
    super.key,
    required String fallbackMessage,
    this.onRetry,
  }) : message = fallbackMessage,
       code = null,
       traceId = null,
       _error = error;

  /// Human-readable description of the failure.
  final String message;

  /// Stable error code, such as `IDENTITY.MFA.CODE_EXPIRED`.
  final String? code;

  /// Trace id returned by the API for the failed request.
  final String? traceId;

  /// Called when the retry button is tapped.
  final VoidCallback? onRetry;

  final Object? _error;

  /// A SelectionArea keeps the lines copyable without the per-line long-press target of SelectableText, which is shorter than the minimum tap target.
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final small = theme.textTheme.labelSmall?.copyWith(
      color: scheme.onSurfaceVariant,
    );
    final retry = onRetry;
    final l10n = AppLocalizations.of(context);
    final source = _error;
    final fromError = source == null
        ? null
        : ErrorPresenter(l10n).describe(source);
    final errorCode = fromError?.code ?? code;
    final errorTraceId = fromError?.traceId ?? traceId;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline,
              size: AppIconSize.xl,
              color: scheme.error,
            ),
            const SizedBox(height: AppSpacing.md),
            Semantics(
              liveRegion: true,
              child: Text(
                message,
                style: theme.textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
            ),
            if (errorCode != null || errorTraceId != null)
              SelectionArea(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (errorCode != null) ...[
                      const SizedBox(height: AppSpacing.sm),
                      Text(l10n.errorCodeLine(errorCode), style: small),
                    ],
                    if (errorTraceId != null) ...[
                      const SizedBox(height: AppSpacing.xs),
                      Text(l10n.errorTraceIdLine(errorTraceId), style: small),
                    ],
                  ],
                ),
              ),
            if (retry != null) ...[
              const SizedBox(height: AppSpacing.md),
              AppButton(
                label: l10n.actionRetry,
                onPressed: retry,
                variant: AppButtonVariant.secondary,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
