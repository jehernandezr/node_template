import 'package:auth/auth.dart';
import 'package:contracts/contracts.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

/// Real sign-in against identity, in the three steps of the plan.
///
/// Email and password first. When identity asks for a second factor the
/// user picks a method, the form requests the challenge
/// (`POST /v1/auth/mfa/challenges`) and verifies the code with its
/// `challengeId`. Once the session is open it loads the session access and
/// calls [onSignedIn].
class SignInForm extends StatefulWidget {
  const SignInForm({
    super.key,
    required this.connection,
    required this.onSignedIn,
  });

  final IdentityConnection connection;

  /// Runs once the session and its access are loaded.
  final VoidCallback onSignedIn;

  @override
  State<SignInForm> createState() => _SignInFormState();
}

/// Second-factor methods this form can complete. A passkey needs WebAuthn,
/// which the form does not drive yet.
const _supportedMethods = {
  MfaFactor.deviceOtp,
  MfaFactor.emailOtp,
  MfaFactor.totp,
  MfaFactor.recoveryCode,
};

class _SignInFormState extends State<SignInForm> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _code = TextEditingController();
  PendingMfa? _pending;
  MfaChallenge? _challenge;
  String? _errorCode;
  bool _busy = false;

  SessionManager get _manager => widget.connection.sessionManager;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
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

  /// Shows [code] and goes back to the step the error asks for: a dead MFA
  /// token restarts the sign-in, an expired or exhausted challenge asks for a
  /// new one.
  void _showError(String code) {
    _errorCode = code;
    switch (IdentityErrorCode.fromCode(code)) {
      case IdentityErrorCode.mfaTokenInvalid:
        _pending = null;
        _challenge = null;
        _code.clear();
      case IdentityErrorCode.mfaCodeExpired ||
          IdentityErrorCode.mfaTooManyAttempts:
        _challenge = null;
        _code.clear();
      default:
        break;
    }
  }

  Future<void> _signIn() => _run(() async {
    final response = await _manager.signIn(
      SignInRequest(email: _email.text.trim(), password: _password.text),
    );
    final pending = response.mfa;
    if (pending != null) {
      if (mounted) setState(() => _pending = pending);
      return;
    }
    await _finish();
  });

  Future<void> _requestChallenge(PendingMfa pending, MfaFactor method) =>
      _run(() async {
        final challenge = await _manager.requestMfaChallenge(
          mfaToken: pending.mfaToken,
          method: method,
        );
        if (mounted) setState(() => _challenge = challenge);
      });

  Future<void> _verify(PendingMfa pending, MfaChallenge challenge) =>
      _run(() async {
        await _manager.verifyMfa(
          mfaToken: pending.mfaToken,
          challengeId: challenge.challengeId,
          code: _code.text.trim(),
          registerDevice: _manager.canRegisterDevice,
        );
        await _finish();
      });

  Future<void> _finish() async {
    await widget.connection.reloadAccess();
    if (mounted) widget.onSignedIn();
  }

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
          TextField(
            key: const ValueKey('sign-in-email'),
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            maxLength: IdentityLimits.emailMaxLength,
            decoration: InputDecoration(labelText: l10n.signInEmail),
          ),
          TextField(
            key: const ValueKey('sign-in-password'),
            controller: _password,
            obscureText: true,
            autofillHints: const [AutofillHints.password],
            maxLength: IdentityLimits.passwordMaxLength,
            decoration: InputDecoration(labelText: l10n.signInPassword),
            onSubmitted: (_) => _busy ? null : _signIn(),
          ),
          const SizedBox(height: AppSpacing.md),
          AppButton(
            label: l10n.actionSignIn,
            loading: _busy,
            onPressed: _signIn,
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
            key: const ValueKey('sign-in-code'),
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
            key: const ValueKey('sign-in-error'),
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
