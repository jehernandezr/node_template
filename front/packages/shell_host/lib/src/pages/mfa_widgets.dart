import 'package:contracts/contracts.dart';
import 'package:i18n/i18n.dart';
import 'package:material_ui/material_ui.dart';
import 'package:ui/ui.dart';

/// Label of a second-factor method.
String mfaMethodLabel(AppLocalizations l10n, MfaFactor method) =>
    switch (method) {
      MfaFactor.deviceOtp => l10n.mfaMethodDeviceOtp,
      MfaFactor.emailOtp => l10n.mfaMethodEmailOtp,
      MfaFactor.totp => l10n.mfaMethodTotp,
      MfaFactor.recoveryCode => l10n.mfaMethodRecoveryCode,
      MfaFactor.passkey => method.wireCode,
    };

/// One button per offered method. Disabled while [busy].
class MfaMethodPicker extends StatelessWidget {
  const MfaMethodPicker({
    super.key,
    required this.methods,
    required this.busy,
    required this.onPick,
  });

  final List<MfaFactor> methods;
  final bool busy;
  final ValueChanged<MfaFactor> onPick;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(l10n.mfaChooseMethod, textAlign: TextAlign.center),
        const SizedBox(height: AppSpacing.md),
        for (final method in methods)
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: AppButton(
              label: mfaMethodLabel(l10n, method),
              variant: AppButtonVariant.secondary,
              onPressed: busy ? null : () => onPick(method),
            ),
          ),
      ],
    );
  }
}

/// Code field and verify button of a challenge.
class MfaCodeEntry extends StatelessWidget {
  const MfaCodeEntry({
    super.key,
    required this.fieldKey,
    required this.controller,
    required this.challenge,
    required this.busy,
    required this.onVerify,
  });

  final Key fieldKey;
  final TextEditingController controller;
  final MfaChallenge challenge;
  final bool busy;
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

/// Message of the last error of a flow, or nothing.
class MfaErrorText extends StatelessWidget {
  const MfaErrorText({super.key, required this.textKey, required this.code});

  final Key textKey;
  final String? code;

  @override
  Widget build(BuildContext context) {
    final errorCode = code;
    if (errorCode == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.md),
      child: Text(
        errorMessage(AppLocalizations.of(context), errorCode),
        key: textKey,
        textAlign: TextAlign.center,
        style: TextStyle(color: Theme.of(context).colorScheme.error),
      ),
    );
  }
}
