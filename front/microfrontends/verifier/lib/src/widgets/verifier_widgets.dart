import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../data/login_challenge.dart';
import '../l10n/generated/verifier_localizations.dart';

/// Groups an 8-digit code as 4-4, e.g. `1234 5678`.
String groupCode(String code) {
  if (code.length != 8) return code;
  return '${code.substring(0, 4)} ${code.substring(4)}';
}

/// Formats seconds as mm:ss.
String formatCountdown(int seconds) {
  final safe = seconds < 0 ? 0 : seconds;
  final minutes = (safe ~/ 60).toString().padLeft(2, '0');
  final rest = (safe % 60).toString().padLeft(2, '0');
  return '$minutes:$rest';
}

/// Large monospaced code with a copy action.
class VerifierCodeCard extends StatelessWidget {
  /// Creates the card. A null [code] shows the loading placeholder.
  const VerifierCodeCard({
    super.key,
    required this.code,
    required this.failed,
    required this.copied,
    required this.onCopy,
  });

  /// The 8-digit code, or null while it is generated.
  final String? code;

  /// True when the device could not generate the code.
  final bool failed;

  /// True right after the code was copied.
  final bool copied;

  /// Copies the code to the clipboard.
  final VoidCallback? onCopy;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = VerifierLocalizations.of(context);
    final value = code;
    final String text;
    if (failed) {
      text = l10n.codeFailed;
    } else if (value == null) {
      text = l10n.codeLoading;
    } else {
      text = groupCode(value);
    }
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l10n.codeTitle, style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.xs),
          Text(
            l10n.codeMessage,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            text,
            textAlign: TextAlign.center,
            style: (value == null || failed)
                ? theme.textTheme.bodyLarge
                : theme.textTheme.displaySmall?.copyWith(
                    fontFamily: 'monospace',
                    letterSpacing: 4,
                    fontWeight: FontWeight.w600,
                  ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Align(
            alignment: Alignment.center,
            child: TextButton.icon(
              onPressed: value == null || failed ? null : onCopy,
              icon: Icon(copied ? Icons.check : Icons.copy),
              label: Text(
                copied ? l10n.codeCopied : l10n.copyCode,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Countdown bar with the remaining time.
class VerifierCountdown extends StatelessWidget {
  /// Creates the countdown.
  const VerifierCountdown({
    super.key,
    required this.secondsLeft,
    required this.totalSeconds,
  });

  /// Seconds until the code expires.
  final int secondsLeft;

  /// Total validity in seconds, used for the progress bar.
  final int totalSeconds;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final progress = totalSeconds <= 0
        ? 0.0
        : (secondsLeft / totalSeconds).clamp(0.0, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          VerifierLocalizations.of(
            context,
          ).expiresIn(formatCountdown(secondsLeft)),
          style: theme.textTheme.labelLarge,
        ),
        const SizedBox(height: AppSpacing.sm),
        LinearProgressIndicator(value: progress),
      ],
    );
  }
}

/// Attempt details: browser, OS, approximate city and IP.
class VerifierContextCard extends StatelessWidget {
  /// Creates the card for [context].
  const VerifierContextCard({super.key, required this.attempt});

  /// Context of the attempt.
  final LoginAttemptContext attempt;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = VerifierLocalizations.of(context);
    final rows = <(String, String)>[
      (l10n.browser, attempt.browser),
      (l10n.os, attempt.os),
      (l10n.city, attempt.city),
      (l10n.ip, attempt.ip),
    ];
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l10n.contextTitle, style: theme.textTheme.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          for (final (label, value) in rows)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 2,
                    child: Text(
                      label,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: Text(value, style: theme.textTheme.bodyMedium),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Notice shown after an attempt was blocked.
class VerifierBlockedNotice extends StatelessWidget {
  /// Creates the notice.
  const VerifierBlockedNotice({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = VerifierLocalizations.of(context);
    return AppCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.shield_outlined, color: theme.colorScheme.primary),
          const SizedBox(width: AppSpacing.sm + AppSpacing.xs),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.blockedTitle, style: theme.textTheme.titleMedium),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  l10n.blockedBody,
                  style: theme.textTheme.bodyMedium,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
