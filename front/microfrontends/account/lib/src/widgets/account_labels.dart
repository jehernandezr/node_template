import 'package:contracts/contracts.dart' show ClientPlatform, MfaFactor;

import '../l10n/generated/account_localizations.dart';

/// Nombre de [platform] para mostrar.
String platformLabel(AccountLocalizations l10n, ClientPlatform platform) =>
    switch (platform) {
      ClientPlatform.ios => l10n.platformIos,
      ClientPlatform.android => l10n.platformAndroid,
      ClientPlatform.web => l10n.platformWeb,
      ClientPlatform.macos => l10n.platformMacos,
      ClientPlatform.windows => l10n.platformWindows,
      ClientPlatform.linux => l10n.platformLinux,
    };

/// Nombre de [factor] para mostrar.
String mfaFactorLabel(AccountLocalizations l10n, MfaFactor factor) =>
    switch (factor) {
      MfaFactor.deviceOtp => l10n.factorDeviceOtp,
      MfaFactor.emailOtp => l10n.factorEmailOtp,
      MfaFactor.totp => l10n.factorTotp,
      MfaFactor.recoveryCode => l10n.factorRecoveryCode,
      MfaFactor.passkey => l10n.factorPasskey,
    };
