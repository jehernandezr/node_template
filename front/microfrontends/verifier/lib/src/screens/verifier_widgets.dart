import 'dart:async';

import 'package:flutter/semantics.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import '../l10n/generated/verifier_localizations.dart';
import '../shared/constants/verifier_constants.dart';
import '../shared/types/login_challenge.dart';
import '../shared/utils/verifier_codes.dart';
import 'verifier_state.dart';

/// Large monospaced code with a copy action.
class VerifierCodeCard extends StatelessWidget {
  /// Creates the card. An error in [code] shows a localized message.
  const VerifierCodeCard({
    super.key,
    required this.code,
    required this.copied,
    required this.onCopy,
  });

  /// The code while it is generated, ready or failed.
  final AsyncValue<String> code;

  /// True right after the code was copied.
  final bool copied;

  /// Copies the code to the clipboard.
  final VoidCallback? onCopy;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = VerifierLocalizations.of(context);
    final style = code.valueOrNull == null
        ? theme.textTheme.bodyLarge
        : theme.textTheme.displaySmall?.copyWith(
            fontFamily: 'monospace',
            letterSpacing: 4,
            fontWeight: FontWeight.w600,
          );
    final codeText = switch (code) {
      AsyncError<String>() => Text(
        l10n.codeFailed,
        textAlign: TextAlign.center,
        style: style,
      ),
      AsyncLoading<String>() => Text(
        l10n.codeLoading,
        textAlign: TextAlign.center,
        style: style,
      ),
      AsyncData<String>(value: final ready) => Semantics(
        container: true,
        label: l10n.codeTitle,
        value: spokenCode(ready),
        child: ExcludeSemantics(
          child: Text(
            groupCode(ready),
            textAlign: TextAlign.center,
            style: style,
          ),
        ),
      ),
    };
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
          codeText,
          const SizedBox(height: AppSpacing.sm),
          Align(
            alignment: AlignmentDirectional.center,
            child: TextButton.icon(
              onPressed: code.valueOrNull == null ? null : onCopy,
              icon: Icon(copied ? Icons.check : Icons.copy),
              label: Text(copied ? l10n.codeCopied : l10n.copyCode),
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
    final l10n = VerifierLocalizations.of(context);
    final progress = totalSeconds <= 0
        ? 0.0
        : (secondsLeft / totalSeconds).clamp(0.0, 1.0).toDouble();
    return Semantics(
      container: true,
      label: l10n.expiresIn(formatCountdown(secondsLeft)),
      liveRegion: false,
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.expiresIn(formatCountdown(secondsLeft)),
            style: theme.textTheme.labelLarge,
          ),
          const SizedBox(height: AppSpacing.sm),
          TweenAnimationBuilder<double>(
            tween: Tween<double>(end: progress),
            duration: MediaQuery.disableAnimationsOf(context)
                ? Duration.zero
                : verifierTick,
            builder: (context, value, _) =>
                LinearProgressIndicator(value: value),
          ),
        ],
      ),
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
              child: MergeSemantics(
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
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.blockedTitle, style: theme.textTheme.titleMedium),
                const SizedBox(height: AppSpacing.xs),
                Text(l10n.blockedBody, style: theme.textTheme.bodyMedium),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Announces the milestones of a challenge to assistive technology: once when
/// [verifierWarningSeconds] are left and once when the code expires. The
/// countdown itself is not announced every second.
class VerifierAnnouncer extends StatefulWidget {
  /// Creates the announcer over [child], watching [state].
  const VerifierAnnouncer({
    super.key,
    required this.state,
    required this.child,
  });

  /// State of the screen; each change is compared with the previous one.
  final VerifierState state;

  /// The screen.
  final Widget child;

  @override
  State<VerifierAnnouncer> createState() => _VerifierAnnouncerState();
}

class _VerifierAnnouncerState extends State<VerifierAnnouncer> {
  @override
  Widget build(BuildContext context) => widget.child;

  @override
  void didUpdateWidget(VerifierAnnouncer oldWidget) {
    super.didUpdateWidget(oldWidget);
    final before = _secondsOf(oldWidget.state);
    final after = _secondsOf(widget.state);
    if (before != null &&
        after != null &&
        before > verifierWarningSeconds &&
        after <= verifierWarningSeconds) {
      _announce(
        VerifierLocalizations.of(context)
            .expiresSoonAnnouncement(verifierWarningSeconds),
      );
    } else if (before != null && _expired(widget.state)) {
      _announce(VerifierLocalizations.of(context).codeExpiredAnnouncement);
    }
  }

  void _announce(String message) {
    unawaited(
      SemanticsService.sendAnnouncement(
        View.of(context),
        message,
        Directionality.of(context),
      ),
    );
  }

  static bool _expired(VerifierState state) =>
      state is VerifierWaiting && state.expired;

  static int? _secondsOf(VerifierState state) => switch (state) {
    VerifierChallenge(:final secondsLeft) => secondsLeft,
    VerifierDenying(:final previous) => previous.secondsLeft,
    VerifierLoading() ||
    VerifierWaiting() ||
    VerifierBlocked() ||
    VerifierFailed() => null,
  };
}
