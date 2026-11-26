import 'package:contracts/contracts.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

/// Code field and verify button of a challenge.
class MfaCodeEntry extends StatelessWidget {
  /// Field of the code of [challenge] with its verify button.
  const MfaCodeEntry({
    super.key,
    required this.fieldKey,
    required this.controller,
    required this.challenge,
    required this.busy,
    required this.onVerify,
  });

  /// Key of the code field, for tests.
  final Key fieldKey;

  /// Controller of the code field.
  final TextEditingController controller;

  /// Challenge whose code is entered.
  final MfaChallenge challenge;

  /// Whether a verification is in flight.
  final bool busy;

  /// Called when the user verifies the code.
  final VoidCallback onVerify;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          key: fieldKey,
          controller: controller,
          keyboardType: TextInputType.number,
          textInputAction: TextInputAction.done,
          autofillHints: const [AutofillHints.oneTimeCode],
          maxLength: challenge.codeLength ?? IdentityLimits.mfaCodeMaxLength,
          decoration: InputDecoration(labelText: l10n.mfaCode),
          onSubmitted: (_) => busy ? null : onVerify(),
        ),
        const SizedBox(height: AppSpacing.md),
        AppButton(label: l10n.mfaVerify, loading: busy, onPressed: onVerify),
      ],
    );
  }
}
