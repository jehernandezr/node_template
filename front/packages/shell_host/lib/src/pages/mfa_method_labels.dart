import 'package:contracts/contracts.dart';
import 'package:i18n/i18n.dart';

/// Label of each second-factor method, in the language of [AppLocalizations].
abstract final class MfaMethodLabels {
  /// Label of a second factor method in the user's language.
  static String of(AppLocalizations l10n, MfaFactor method) => switch (method) {
    MfaFactor.deviceOtp => l10n.mfaMethodDeviceOtp,
    MfaFactor.emailOtp => l10n.mfaMethodEmailOtp,
    MfaFactor.totp => l10n.mfaMethodTotp,
    MfaFactor.recoveryCode => l10n.mfaMethodRecoveryCode,
    MfaFactor.passkey => method.wireCode,
  };
}
