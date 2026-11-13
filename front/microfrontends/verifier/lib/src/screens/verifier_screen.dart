import 'dart:async';

import 'package:auth/auth.dart';
import 'package:flutter/services.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import '../data/fake_verifier_repository.dart';
import '../data/login_challenge.dart';
import '../data/verifier_repository.dart';
import '../l10n/generated/verifier_localizations.dart';
import '../widgets/verifier_widgets.dart';

export '../l10n/generated/verifier_localizations.dart';

/// Builds the screen with the repository of [scope].
///
/// This library is deferred: the manifest calls this function after it loads.
/// The repository belongs to the scope, so it is created once per identity and
/// closed when the identity changes. The device key comes from the shell
/// extras when present, otherwise a [FakeDeviceKeyPort] is used.
Widget buildVerifierScreen(MicrofrontendScope scope) {
  final keyPort = scope.services.extra<DeviceKeyPort>() ?? FakeDeviceKeyPort();
  final repository = scope.get<VerifierRepository>(
    (_) => FakeVerifierRepository(keyPort),
    dispose: (repository) => repository.close(),
  );
  return VerifierScreen(repository: repository);
}

/// Device verifier: shows the code for a login attempt from a new device.
///
/// This library is loaded deferred by the manifest, so it must only be
/// imported through `mf_verifier.dart`.
class VerifierScreen extends StatefulWidget {
  /// Creates the screen on top of [repository].
  const VerifierScreen({super.key, required this.repository});

  /// Source of challenges and codes.
  final VerifierRepository repository;

  @override
  State<VerifierScreen> createState() => _VerifierScreenState();
}

class _VerifierScreenState extends State<VerifierScreen> {
  StreamSubscription<LoginChallenge?>? _subscription;
  Timer? _ticker;
  LoginChallenge? _challenge;
  String? _code;
  bool _codeFailed = false;
  bool _copied = false;
  bool _denying = false;
  bool _blocked = false;
  bool _denyFailed = false;
  int _secondsLeft = 0;

  /// Incremented whenever the current challenge changes, so late results of
  /// `autoCode` for an older challenge are ignored.
  int _generation = 0;

  @override
  void initState() {
    super.initState();
    _listen();
  }

  @override
  void didUpdateWidget(covariant VerifierScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.repository != widget.repository) {
      _subscription?.cancel();
      _listen();
    }
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _ticker?.cancel();
    super.dispose();
  }

  void _listen() {
    _subscription = widget.repository.pending().listen(_onChallenge);
  }

  void _onChallenge(LoginChallenge? challenge) {
    _ticker?.cancel();
    _generation++;
    if (challenge == null) {
      setState(() {
        _challenge = null;
        _code = null;
        _codeFailed = false;
        _copied = false;
        _denyFailed = false;
      });
      return;
    }
    final generation = _generation;
    setState(() {
      _challenge = challenge;
      _code = null;
      _codeFailed = false;
      _copied = false;
      _denying = false;
      _blocked = false;
      _denyFailed = false;
      _secondsLeft = challenge.validFor.inSeconds;
    });
    _ticker = Timer.periodic(const Duration(seconds: 1), _onTick);
    widget.repository
        .autoCode(challenge.id)
        .then(
          (code) {
            if (!mounted || generation != _generation) return;
            setState(() => _code = code);
          },
          onError: (Object _) {
            if (!mounted || generation != _generation) return;
            setState(() => _codeFailed = true);
          },
        );
  }

  void _onTick(Timer timer) {
    if (!mounted) return;
    if (_secondsLeft <= 1) {
      // The code expired: drop the challenge locally.
      timer.cancel();
      _generation++;
      setState(() {
        _challenge = null;
        _code = null;
        _secondsLeft = 0;
      });
      return;
    }
    setState(() => _secondsLeft--);
  }

  Future<void> _copyCode() async {
    final code = _code;
    if (code == null) return;
    await Clipboard.setData(ClipboardData(text: code));
    if (!mounted) return;
    setState(() => _copied = true);
  }

  Future<void> _confirmDeny() async {
    final challenge = _challenge;
    if (challenge == null || _denying) return;
    final l10n = VerifierLocalizations.of(context);
    final shared = AppLocalizations.of(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(l10n.denyDialogTitle),
        content: Text(l10n.denyDialogBody),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text(shared.actionCancel),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: Text(l10n.denyConfirm),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() {
      _denying = true;
      _denyFailed = false;
    });
    try {
      await widget.repository.deny(challenge.id);
      if (!mounted) return;
      _ticker?.cancel();
      _generation++;
      setState(() {
        _denying = false;
        _blocked = true;
        _challenge = null;
        _code = null;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _denying = false;
        _denyFailed = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = VerifierLocalizations.of(context);
    final challenge = _challenge;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.title)),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          if (_blocked) ...[
            const VerifierBlockedNotice(),
            const SizedBox(height: AppSpacing.md),
          ],
          if (challenge == null)
            EmptyState(
              icon: Icons.verified_user_outlined,
              title: l10n.readyTitle,
              message: l10n.readyMessage,
            )
          else ...[
            VerifierCodeCard(
              code: _code,
              failed: _codeFailed,
              copied: _copied,
              onCopy: _copyCode,
            ),
            const SizedBox(height: AppSpacing.md),
            VerifierCountdown(
              secondsLeft: _secondsLeft,
              totalSeconds: challenge.validFor.inSeconds,
            ),
            const SizedBox(height: AppSpacing.md),
            VerifierContextCard(attempt: challenge.context),
            const SizedBox(height: AppSpacing.md),
            AppButton(
              label: l10n.denyButton,
              variant: AppButtonVariant.danger,
              loading: _denying,
              onPressed: _confirmDeny,
            ),
            if (_denyFailed) ...[
              const SizedBox(height: AppSpacing.sm),
              Text(
                l10n.denyFailed,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
          ],
        ],
      ),
    );
  }
}
