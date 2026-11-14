import 'package:contracts/contracts.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:tokens/tokens.dart';

import 'app_button.dart';

/// Error message with the stable error [code] and [traceId] for support.
///
/// The code and trace id are selectable so users can copy them into a
/// support request. The retry button appears only when [onRetry] is set.
///
/// The labels come from [AppLocalizations] (`errorCodeLabel`,
/// `errorTraceIdLabel` and `actionRetry`), so the app must provide it.
class ErrorView extends StatelessWidget {
  /// Creates an error view showing a human [message].
  const ErrorView({
    super.key,
    required this.message,
    this.code,
    this.traceId,
    this.onRetry,
  });

  /// Creates an error view from an API [problem] document. The [message] is
  /// shown to the user and the problem's code and trace id are displayed
  /// for support.
  factory ErrorView.fromProblem(
    ProblemDetails problem, {
    Key? key,
    required String message,
    VoidCallback? onRetry,
  }) {
    return ErrorView(
      key: key,
      message: message,
      code: problem.code,
      traceId: problem.traceId,
      onRetry: onRetry,
    );
  }

  /// Creates an error view from any [error]. When the error is an
  /// [ApiErrorException] its problem's code and trace id are shown;
  /// otherwise only [fallbackMessage] is shown.
  factory ErrorView.fromException(
    Object error, {
    Key? key,
    required String fallbackMessage,
    VoidCallback? onRetry,
  }) {
    if (error is ApiErrorException) {
      return ErrorView.fromProblem(
        error.problem,
        key: key,
        message: fallbackMessage,
        onRetry: onRetry,
      );
    }
    return ErrorView(key: key, message: fallbackMessage, onRetry: onRetry);
  }

  /// Human-readable description of the failure.
  final String message;

  /// Stable error code, such as `IDENTITY.MFA.CODE_EXPIRED`.
  final String? code;

  /// Trace id returned by the API for the failed request.
  final String? traceId;

  /// Called when the retry button is tapped.
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final small = theme.textTheme.labelSmall?.copyWith(
      color: scheme.onSurfaceVariant,
    );
    final errorCode = code;
    final errorTraceId = traceId;
    final retry = onRetry;
    final l10n = AppLocalizations.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: scheme.error),
            const SizedBox(height: AppSpacing.md),
            Text(
              message,
              style: theme.textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            if (errorCode != null) ...[
              const SizedBox(height: AppSpacing.sm),
              SelectableText(
                '${l10n.errorCodeLabel}: $errorCode',
                style: small,
              ),
            ],
            if (errorTraceId != null) ...[
              const SizedBox(height: AppSpacing.xs),
              SelectableText(
                '${l10n.errorTraceIdLabel}: $errorTraceId',
                style: small,
              ),
            ],
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
