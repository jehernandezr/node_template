import type { RedactionWordLists } from './redaction-word-lists.js';

/**
 * Redaction rules: the word lists of `RedactionWordLists`. The defaults cover
 * common secrets; a service extends them with `extend`. Immutable.
 */
export class RedactionRules {
  constructor(readonly lists: RedactionWordLists) {}

  /**
   * Returns the platform default rules. Each call returns new lists.
   * Words that, as the last word of the key, name the secret itself (`accessToken`, `setCookie`, `userOtp`). `sessions` is not included: a list of sessions carries ids and dates, and the token of each one is hidden by its own key.
   * Words that, at the start of the key, announce a secret value (`passwordConfirmation`, `secretValue`). `session` and `cookie` are not included: `sessionCount` or `cookieConsent` describe the secret, they do not contain it.
   * Last words that never carry a secret: ids, instants and counts. With them `sessionId`, `apiKeyId`, `passwordChangedAt` or `tokenCount` stay visible, which is what is needed to diagnose a revocation or a password change.
   * A hash or digest is as sensitive as what it summarizes when that is a secret (`tokenHash`, `codeHmac`): it can be used to test a guessed value.
   * Compound names that only make sense together (`privateKey`, `signing_key`).
   * `code` is sensitive only when qualified by one of these words: the one-time MFA, verification, recovery or reset codes (`mfaCode`, `verificationCode`, `oneTimeCode`, `recovery_codes`). `errorCode`, `statusCode` or `countryCode` stay visible.
   * @returns The rules.
   */
  static defaults(): RedactionRules {
    return new RedactionRules({
      sensitiveLastWords: new Set([
        'token',
        'password',
        'passwd',
        'passcode',
        'passcodes',
        'secret',
        'authorization',
        'cookie',
        'cookies',
        'credential',
        'credentials',
        'signature',
        'jwt',
        'bearer',
        'otp',
        'session',
        'passphrase',
        'pin',
        'pins',
        'cvv',
        'cvc',
        'pan',
      ]),
      sensitiveFirstWords: new Set([
        'password',
        'passwd',
        'passcode',
        'passphrase',
        'secret',
        'authorization',
        'jwt',
        'bearer',
        'otp',
        'pin',
        'cvv',
        'cvc',
      ]),
      publicLastWords: new Set(['id', 'ids', 'at', 'count', 'counts']),
      digestWords: new Set(['hash', 'hashes', 'hmac', 'digest']),
      digestedSecrets: new Set([
        'token',
        'password',
        'passcode',
        'secret',
        'otp',
        'pin',
        'code',
        'key',
      ]),
      sensitiveCompounds: new Set([
        'apikey',
        'privatekey',
        'secretkey',
        'signingkey',
        'accesskey',
        'encryptionkey',
      ]),
      codeWords: new Set(['code', 'codes']),
      secretCodeQualifiers: new Set([
        'mfa',
        'verification',
        'verify',
        'recovery',
        'reset',
        'otp',
        'one',
        'totp',
        'hotp',
        'factor',
        'auth',
        'authorization',
        'confirmation',
        'confirm',
        'security',
        'backup',
        'sms',
        'email',
        'device',
        'login',
        'access',
        'activation',
        'invite',
        'invitation',
        'pairing',
        'unlock',
      ]),
    });
  }

  /**
   * Returns new rules with additional sensitive words (lowercase) as the last word of the key.
   * @param extraSensitiveLastWords Words to add.
   * @returns The new rules.
   */
  extend(extraSensitiveLastWords: readonly string[]): RedactionRules {
    return new RedactionRules({
      ...this.lists,
      sensitiveLastWords: new Set([
        ...this.lists.sensitiveLastWords,
        ...extraSensitiveLastWords.map((word) => word.toLowerCase()),
      ]),
    });
  }
}
