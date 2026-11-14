import 'package:auth/auth.dart';
import 'package:contracts/contracts.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

/// Real step-up of an open session against identity, with the MFA types of
/// the sign-in.
///
/// It opens the step-up (`POST /v1/me/step-up`) as soon as it shows, lets the
/// user pick one of the offered methods, requests the challenge
/// (`POST /v1/me/step-up/challenges`) and verifies the code
/// (`POST /v1/me/step-up/verify`). The session adopts the new access token,
/// which carries the fresh second factor, and [onVerified] gets the new
/// `mfaVerifiedAt`.
class StepUpForm extends StatefulWidget {
  const StepUpForm({
    super.key,
    required this.connection,
    required this.onVerified,
  });

  final IdentityConnection connection;

  /// Runs once the second factor is verified, with the new `mfaVerifiedAt`.
  final ValueChanged<DateTime> onVerified;

  @override
  State<StepUpForm> createState() => _StepUpFormState();
}

/// Second-factor methods this form can complete. A passkey needs WebAuthn,
/// which the form does not drive yet.
const _supportedMethods = {
  MfaFactor.deviceOtp,
  MfaFactor.emailOtp,
  MfaFactor.totp,
  MfaFactor.recoveryCode,
};

class _StepUpFormState extends State<StepUpForm> {
  final _code = TextEditingController();
  PendingMfa? _pending;
  MfaChallenge? _challenge;
  String? _errorCode;

  // Busy from the first frame: the step-up opens right after it.
  bool _busy = true;

  SessionManager get _manager => widget.connection.sessionManager;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _start();
    });
  }

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() step) async {
    setState(() {
      _busy = true;
      _errorCode = null;
    });
    try {
      await step();
    } on ApiErrorException catch (error) {
      if (mounted) setState(() => _showError(error.problem.code));
    } on ContractViolationException {
      if (mounted) {
        setState(
          () => _errorCode = PlatformErrorCode.validationInvalidInput.code,
        );
      }
    } catch (_) {
      // Network failures and the like: a generic message, never raw text.
      if (mounted) {
        setState(() => _errorCode = PlatformErrorCode.internalUnexpected.code);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Shows [code] and goes back to the step the error asks for: a dead
  /// step-up token opens a new step-up, an expired or exhausted challenge or
  /// a method that is not offered asks for another challenge.
  void _showError(String code) {
    _errorCode = code;
    switch (IdentityErrorCode.fromCode(code)) {
      case IdentityErrorCode.mfaTokenInvalid:
        _pending = null;
        _challenge = null;
        _code.clear();
      case IdentityErrorCode.mfaCodeExpired ||
          IdentityErrorCode.mfaTooManyAttempts ||
          IdentityErrorCode.mfaMethodUnavailable:
        _challenge = null;
        _code.clear();
      default:
        break;
    }
  }

  Future<void> _start() => _run(() async {
    final pending = await _manager.startStepUp();
    if (mounted) setState(() => _pending = pending);
  });

  Future<void> _requestChallenge(PendingMfa pending, MfaFactor method) =>
      _run(() async {
        final challenge = await _manager.requestStepUpChallenge(
          mfaToken: pending.mfaToken,
          method: method,
        );
        if (mounted) setState(() => _challenge = challenge);
      });

  Future<void> _verify(PendingMfa pending, MfaChallenge challenge) =>
      _run(() async {
        final result = await _manager.verifyStepUp(
          mfaToken: pending.mfaToken,
          challengeId: challenge.challengeId,
          code: _code.text.trim(),
        );
        if (mounted) widget.onVerified(result.mfaVerifiedAt);
      });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final pending = _pending;
    final challenge = _challenge;
    final errorCode = _errorCode;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (pending == null) ...[
          if (_busy)
            const Center(child: CircularProgressIndicator())
          else
            AppButton(
              key: const ValueKey('step-up-retry'),
              label: l10n.actionRetry,
              variant: AppButtonVariant.secondary,
              onPressed: _start,
            ),
        ] else if (challenge == null) ...[
          Text(l10n.mfaChooseMethod, textAlign: TextAlign.center),
          const SizedBox(height: AppSpacing.md),
          for (final method in pending.methods)
            if (_supportedMethods.contains(method))
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: AppButton(
                  label: _methodLabel(l10n, method),
                  variant: AppButtonVariant.secondary,
                  onPressed: _busy
                      ? null
                      : () => _requestChallenge(pending, method),
                ),
              ),
        ] else ...[
          TextField(
            key: const ValueKey('step-up-code'),
            controller: _code,
            autofillHints: const [AutofillHints.oneTimeCode],
            maxLength: challenge.codeLength ?? IdentityLimits.mfaCodeMaxLength,
            decoration: InputDecoration(labelText: l10n.mfaCode),
            onSubmitted: (_) => _busy ? null : _verify(pending, challenge),
          ),
          const SizedBox(height: AppSpacing.md),
          AppButton(
            label: l10n.mfaVerify,
            loading: _busy,
            onPressed: () => _verify(pending, challenge),
          ),
        ],
        if (errorCode != null) ...[
          const SizedBox(height: AppSpacing.md),
          Text(
            errorMessage(l10n, errorCode),
            key: const ValueKey('step-up-error'),
            textAlign: TextAlign.center,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ],
      ],
    );
  }

  static String _methodLabel(AppLocalizations l10n, MfaFactor method) =>
      switch (method) {
        MfaFactor.deviceOtp => l10n.mfaMethodDeviceOtp,
        MfaFactor.emailOtp => l10n.mfaMethodEmailOtp,
        MfaFactor.totp => l10n.mfaMethodTotp,
        MfaFactor.recoveryCode => l10n.mfaMethodRecoveryCode,
        MfaFactor.passkey => method.wireCode,
      };
}
