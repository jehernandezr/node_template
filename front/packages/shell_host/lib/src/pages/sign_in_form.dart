import 'package:auth/auth.dart';
import 'package:contracts/contracts.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import 'mfa_code_entry.dart';
import 'mfa_error_text.dart';
import 'mfa_method_picker.dart';
import 'mfa_state_step.dart';

/// Real sign-in against identity. Draws the state of a [SignInFlow]: email
/// and password, then the method of the second factor, then its code.
class SignInForm extends StatefulWidget {
  /// Email and password form that signs in through [connection].
  const SignInForm({
    super.key,
    required this.connection,
    required this.onSignedIn,
  });

  /// Connection that signs in.
  final IdentityConnection connection;

  /// Runs once the session and its access are loaded.
  final VoidCallback onSignedIn;

  @override
  State<SignInForm> createState() => _SignInFormState();
}

class _SignInFormState extends State<SignInForm> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _code = TextEditingController();
  late final SignInFlow _flow = SignInFlow(widget.connection)
    ..addListener(_clearDeadCode);

  /// A challenge that the flow dropped takes its code with it.
  void _clearDeadCode() {
    if (_flow.state.challenge == null) _code.clear();
  }

  @override
  void dispose() {
    _flow.dispose();
    _email.dispose();
    _password.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    final done = await _flow.signIn(
      email: _email.text.trim(),
      password: _password.text,
    );
    if (done && mounted) widget.onSignedIn();
  }

  Future<void> _verify() async {
    final done = await _flow.verify(_code.text.trim());
    if (done && mounted) widget.onSignedIn();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return ListenableBuilder(
      listenable: _flow,
      builder: (context, _) {
        final state = _flow.state;
        final busy = state.isBusy;
        return Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            switch (state.step) {
              MfaIdle() => Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    key: const ValueKey('sign-in-email'),
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.email],
                    maxLength: IdentityLimits.emailMaxLength,
                    decoration: InputDecoration(labelText: l10n.signInEmail),
                  ),
                  TextField(
                    key: const ValueKey('sign-in-password'),
                    controller: _password,
                    obscureText: true,
                    textInputAction: TextInputAction.done,
                    autofillHints: const [AutofillHints.password],
                    maxLength: IdentityLimits.passwordMaxLength,
                    decoration: InputDecoration(labelText: l10n.signInPassword),
                    onSubmitted: (_) => busy ? null : _signIn(),
                  ),
                  const SizedBox(height: AppSpacing.md),
                  AppButton(
                    label: l10n.actionSignIn,
                    loading: busy,
                    onPressed: _signIn,
                  ),
                ],
              ),
              MfaAwaitingMethod() => MfaMethodPicker(
                methods: _flow.methods,
                busy: busy,
                onPick: _flow.requestChallenge,
              ),
              MfaAwaitingCode(:final challenge) => MfaCodeEntry(
                fieldKey: const ValueKey('sign-in-code'),
                controller: _code,
                challenge: challenge,
                busy: busy,
                onVerify: _verify,
              ),
            },
            MfaErrorText(
              textKey: const ValueKey('sign-in-error'),
              code: state.errorCode,
            ),
          ],
        );
      },
    );
  }
}
