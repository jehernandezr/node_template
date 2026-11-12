// GENERATED, do not edit.
// Fuente: backend/libs/contracts/*/export/contract.json.
// Regenerar: cd front && dart run contracts_gen

/// Constantes `IdentityLimits` del contrato `identity`.
abstract final class IdentityLimits {
  static const int emailMaxLength = 254;
  static const int passwordMaxLength = 128;
  static const int deviceIdMaxLength = 512;
  static const int deviceNameMaxLength = 120;
  static const int devicePublicKeyMaxLength = 2048;
  static const int mfaTokenMaxLength = 2048;
  static const int mfaCodeMinLength = 6;
  static const int mfaCodeMaxLength = 64;
  static const int tokenMaxLength = 8192;
}

/// Constantes `MfaRules` del contrato `identity`.
abstract final class MfaRules {
  static const int deviceCodeLength = 8;
  static const int emailCodeLength = 6;
  static const int maxAttemptsPerChallenge = 5;
  static const int stepUpMaxAgeMinutes = 10;
}
