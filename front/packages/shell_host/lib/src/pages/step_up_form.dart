import 'package:auth/auth.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

import 'mfa_widgets.dart';

/// Real step-up of an open session against identity. Draws the state of a
/// [StepUpFlow], which opens as soon as the form shows; [onVerified] gets the
/// new `mfaVerifiedAt`.
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

class _StepUpFormState extends State<StepUpForm> {
  final _code = TextEditingController();
  late final StepUpFlow _flow = StepUpFlow(widget.connection.sessionManager)
    ..addListener(_clearDeadCode);

  @override
  void initState() {
    super.initState();
    // After the first frame: starting notifies listeners, which must not
    // happen while the tree builds.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _flow.start();
    });
  }

  void _clearDeadCode() {
    if (_flow.challenge == null) _code.clear();
  }

  @override
  void dispose() {
    _flow.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _verify() async {
    final verifiedAt = await _flow.verify(_code.text.trim());
    if (verifiedAt != null && mounted) widget.onVerified(verifiedAt);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return ListenableBuilder(
      listenable: _flow,
      builder: (context, _) {
        final pending = _flow.pending;
        final challenge = _flow.challenge;
        return Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (pending == null)
              _flow.busy
                  ? const Center(child: CircularProgressIndicator())
                  : AppButton(
                      key: const ValueKey('step-up-retry'),
                      label: l10n.actionRetry,
                      variant: AppButtonVariant.secondary,
                      onPressed: _flow.start,
                    )
            else if (challenge == null)
              MfaMethodPicker(
                methods: _flow.methods,
                busy: _flow.busy,
                onPick: _flow.requestChallenge,
              )
            else
              MfaCodeEntry(
                fieldKey: const ValueKey('step-up-code'),
                controller: _code,
                challenge: challenge,
                busy: _flow.busy,
                onVerify: _verify,
              ),
            MfaErrorText(
              textKey: const ValueKey('step-up-error'),
              code: _flow.errorCode,
            ),
          ],
        );
      },
    );
  }
}
