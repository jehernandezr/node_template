import type { RedactionWordLists } from './redaction-word-lists.js';

/**
 * Reglas de redacción: las listas de palabras de `RedactionWordLists`. Los
 * valores por defecto cubren los secretos comunes; un servicio los amplía con
 * `extend`. Es inmutable.
 */
export class RedactionRules {
  constructor(readonly lists: RedactionWordLists) {}

  /** Las reglas por defecto de la plataforma. Cada llamada devuelve listas nuevas. */
  static defaults(): RedactionRules {
    return new RedactionRules({
      /**
       * Palabras que, como última palabra de la llave, nombran el secreto mismo
       * (`accessToken`, `setCookie`, `userOtp`). `sessions` no está: una lista de
       * sesiones lleva ids y fechas, y el token de cada una se oculta por su propia
       * llave.
       */
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
      /**
       * Palabras que, al inicio de la llave, anuncian un valor secreto
       * (`passwordConfirmation`, `secretValue`). `session` y `cookie` no están:
       * `sessionCount` o `cookieConsent` describen el secreto, no lo contienen.
       */
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
      /**
       * Últimas palabras que nunca llevan un secreto: ids, instantes y conteos.
       * Con ellas `sessionId`, `apiKeyId`, `passwordChangedAt` o `tokenCount` quedan
       * visibles, que es con lo que se diagnostica una revocación o un cambio de
       * contraseña.
       */
      publicLastWords: new Set(['id', 'ids', 'at', 'count', 'counts']),
      /**
       * Un hash o digest es tan sensible como lo que resume cuando este es un
       * secreto (`tokenHash`, `codeHmac`): con él se prueba un valor adivinado.
       */
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
      /** Nombres compuestos que solo tienen sentido juntos (`privateKey`, `signing_key`). */
      sensitiveCompounds: new Set([
        'apikey',
        'privatekey',
        'secretkey',
        'signingkey',
        'accesskey',
        'encryptionkey',
      ]),
      /**
       * `code` solo es sensible cuando lo califica una de estas palabras: los códigos
       * de un solo uso de MFA, verificación, recuperación o reset (`mfaCode`,
       * `verificationCode`, `oneTimeCode`, `recovery_codes`). `errorCode`,
       * `statusCode` o `countryCode` se mantienen visibles.
       */
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

  /** Reglas nuevas con palabras sensibles adicionales (en minúscula) como última palabra de la llave. */
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
