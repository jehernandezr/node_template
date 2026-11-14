import 'dart:async';

import 'package:auth/auth.dart';
import 'package:flutter/services.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:shell_core/shell_core.dart';
import 'package:ui/ui.dart';

import '../data/fake_verifier_repository.dart';
import '../data/verifier_repository.dart';
import '../l10n/generated/verifier_localizations.dart';
import '../shared/constants/verifier_constants.dart';
import '../shared/types/login_challenge.dart';
import 'verifier_widgets.dart';

export '../l10n/generated/verifier_localizations.dart';

/// Builds the screen with the repository of [scope].
///
/// This library is deferred: the manifest calls this function after it loads.
/// The repository belongs to the scope, so it is created once per identity and
/// disposed by the scope when the identity changes. The device key comes from
/// the shell extras when present, otherwise a [FakeDeviceKeyPort] is used.
Widget buildVerifierScreen(MicrofrontendScope scope) {
  final repository = scope.get<VerifierRepository>(
    (services) => FakeVerifierRepository(
      services.extra<DeviceKeyPort>() ?? FakeDeviceKeyPort(),
    ),
  );
  return VerifierScreen(repository: repository);
}

/// Device verifier: shows the code for a login attempt from a new device.
///
/// It provides its own localizations, read here inside the deferred chunk.
class VerifierScreen extends StatelessWidget {
  /// Creates the screen on top of [repository].
  const VerifierScreen({super.key, required this.repository});

  /// Source of challenges and codes.
  final VerifierRepository repository;

  @override
  Widget build(BuildContext context) {
    return Localizations.override(
      context: context,
      delegates: [VerifierLocalizations.delegate],
      child: _VerifierView(repository: repository),
    );
  }
}

class _VerifierView extends StatefulWidget {
  const _VerifierView({required this.repository});

  final VerifierRepository repository;

  @override
  State<_VerifierView> createState() => _VerifierViewState();
}

class _VerifierViewState extends State<_VerifierView> {
  StreamSubscription<LoginChallenge?>? _subscription;
  Timer? _ticker;
  AsyncValue<LoginChallenge?> _pending = const AsyncValue.loading();
  AsyncValue<String> _code = const AsyncValue.loading();
  bool _copied = false;
  bool _denying = false;
  bool _blocked = false;
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
  void didUpdateWidget(covariant _VerifierView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.repository != widget.repository) {
      _subscription?.cancel();
      _ticker?.cancel();
      _generation++;
      _pending = const AsyncValue.loading();
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
    _subscription = widget.repository.pending().listen(
      _onChallenge,
      onError: _onPendingError,
    );
  }

  void _retry() {
    _subscription?.cancel();
    setState(() => _pending = const AsyncValue.loading());
    _listen();
  }

  void _onPendingError(Object error, StackTrace stackTrace) {
    _ticker?.cancel();
    _generation++;
    setState(() => _pending = AsyncValue.error(error, stackTrace));
  }

  void _onChallenge(LoginChallenge? challenge) {
    _ticker?.cancel();
    _generation++;
    if (challenge == null) {
      setState(() {
        _pending = const AsyncValue.data(null);
        _code = const AsyncValue.loading();
        _copied = false;
      });
      return;
    }
    final generation = _generation;
    setState(() {
      _pending = AsyncValue.data(challenge);
      _code = const AsyncValue.loading();
      _copied = false;
      _denying = false;
      _blocked = false;
      _secondsLeft = challenge.validFor.inSeconds;
    });
    _ticker = Timer.periodic(verifierTick, _onTick);
    AsyncValue.guard(() => widget.repository.autoCode(challenge.id))
        .then((value) {
          if (!mounted || generation != _generation) return;
          setState(() => _code = value);
        });
  }

  void _onTick(Timer timer) {
    if (!mounted) return;
    if (_secondsLeft <= 1) {
      // The code expired: drop the challenge locally.
      timer.cancel();
      _generation++;
      setState(() {
        _pending = const AsyncValue.data(null);
        _code = const AsyncValue.loading();
        _secondsLeft = 0;
      });
      return;
    }
    setState(() => _secondsLeft--);
  }

  Future<void> _copyCode() async {
    final code = _code.valueOrNull;
    if (code == null) return;
    await Clipboard.setData(ClipboardData(text: code));
    if (!mounted) return;
    setState(() => _copied = true);
  }

  Future<void> _confirmDeny(LoginChallenge challenge) async {
    if (_denying) return;
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
    setState(() => _denying = true);
    try {
      await widget.repository.deny(challenge.id);
      if (!mounted) return;
      _ticker?.cancel();
      _generation++;
      setState(() {
        _denying = false;
        _blocked = true;
        _pending = const AsyncValue.data(null);
        _code = const AsyncValue.loading();
      });
    } on Exception catch (error) {
      // API, contract or network.
      _denyFailed(error, l10n);
    }
  }

  void _denyFailed(Object error, VerifierLocalizations l10n) {
    if (!mounted) return;
    setState(() => _denying = false);
    showActionError(context, error, message: l10n.denyFailed);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = VerifierLocalizations.of(context);
    final shared = AppLocalizations.of(context);
    return AppPage(
      title: l10n.title,
      body: AsyncValueView<LoginChallenge?>(
        value: _pending,
        errorMessage: l10n.loadError,
        onRetry: _retry,
        retryLabel: shared.actionRetry,
        codeLabel: shared.errorCodeLabel,
        traceIdLabel: shared.errorTraceIdLabel,
        data: (challenge) => _content(l10n, challenge),
      ),
    );
  }

  Widget _content(VerifierLocalizations l10n, LoginChallenge? challenge) {
    return ListView(
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
          VerifierCodeCard(code: _code, copied: _copied, onCopy: _copyCode),
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
            onPressed: () => _confirmDeny(challenge),
          ),
        ],
      ],
    );
  }
}
