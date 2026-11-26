// GENERATED, do not edit.
// Source: backend/libs/contracts/*/export/contract.json.
// Regenerate: cd front && dart run contracts_gen
// ignore_for_file: public_member_api_docs

/// `IdentityLimits` constants of the `identity` contract.
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
  static const int roleNameMaxLength = 80;
  static const int maxRolesPerUser = 50;
  static const int permissionVersionMaxLength = 32;
  static const int displayNameMaxLength = 120;
  static const int localeMinLength = 2;
  static const int localeMaxLength = 35;
  static const int actionTokenMaxLength = 512;
  static const int reasonMaxLength = 200;
  static const int groupNameMaxLength = 80;
  static const int maxGroupsPerMember = 50;
  static const int maxPermissionsPerRole = 100;
  static const int passkeyNameMaxLength = 120;
  static const int passkeyOptionsMaxLength = 8192;
  static const int passkeyCredentialMaxLength = 16384;
  static const int totpSecretMaxLength = 128;
  static const int otpauthUriMaxLength = 512;
  static const int totpCodeMinLength = 6;
  static const int totpCodeMaxLength = 8;
  static const int recoveryCodesMax = 20;
  static const int recoveryCodeMinLength = 8;
  static const int recoveryCodeMaxLength = 64;
  static const int devicePushTokenMaxLength = 512;
  static const int deviceNonceMinLength = 16;
  static const int deviceNonceMaxLength = 128;
  static const int deviceSignatureMaxLength = 256;
  static const int maxDeviceApprovals = 20;
  static const int approvalCodeMinLength = 6;
  static const int approvalCodeMaxLength = 64;
  static const int approvalContextMaxLength = 120;
  static const int tenantSlugMinLength = 3;
  static const int tenantSlugMaxLength = 63;
  static const int tenantNameMaxLength = 120;
  static const int regionMaxLength = 32;
  static const int apiBaseUrlMaxLength = 2048;
  static const int maxPushTargets = 50;
  static const int serviceAccountNameMaxLength = 120;
  static const int apiKeyPrefixLength = 12;
  static const int apiKeySecretMaxLength = 128;
  static const int apiKeyInputMaxLength = 256;
  static const int apiKeyCidrMaxLength = 64;
  static const int maxApiKeyCidrs = 20;
  static const int pinnedApiVersionMaxLength = 16;
  static const int clientIpMaxLength = 64;
  static const int jwkFieldMaxLength = 256;
  static const int maxJwks = 10;
}

/// `MfaRules` constants of the `identity` contract.
abstract final class MfaRules {
  static const int deviceCodeLength = 8;
  static const int emailCodeLength = 6;
  static const int maxAttemptsPerChallenge = 5;
  static const int maxChallengesPerWindow = 3;
  static const int challengeWindowMinutes = 15;
  static const int deviceCodeTtlSeconds = 180;
  static const int emailCodeTtlSeconds = 300;
  static const int stepUpMaxAgeMinutes = 10;
}

/// `AccessTokenRules` constants of the `identity` contract.
abstract final class AccessTokenRules {
  static const int minLifetimeSeconds = 600;
  static const int maxLifetimeSeconds = 900;
}
