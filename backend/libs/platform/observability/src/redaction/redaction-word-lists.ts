/** Listas de palabras (en minúscula) con las que `Redactor` decide qué llaves son sensibles. */
export interface RedactionWordLists {
  /** Palabras que, como última palabra de la llave, nombran el secreto mismo (`accessToken`). */
  readonly sensitiveLastWords: ReadonlySet<string>;
  /** Palabras que, al inicio de la llave, anuncian un valor secreto (`passwordConfirmation`). */
  readonly sensitiveFirstWords: ReadonlySet<string>;
  /** Últimas palabras que nunca llevan un secreto: ids, instantes y conteos (`sessionId`). */
  readonly publicLastWords: ReadonlySet<string>;
  /** Palabras de hash o digest (`tokenHash`, `codeHmac`). */
  readonly digestWords: ReadonlySet<string>;
  /** Secretos cuyo hash o digest también es sensible. */
  readonly digestedSecrets: ReadonlySet<string>;
  /** Nombres compuestos que solo tienen sentido juntos (`privatekey`, `signingkey`). */
  readonly sensitiveCompounds: ReadonlySet<string>;
  /** Palabras `code` y `codes`, sensibles solo si las califica una de `secretCodeQualifiers`. */
  readonly codeWords: ReadonlySet<string>;
  /** Calificadores que vuelven secreto un `code` (`mfa`, `verification`, `otp`, `reset`). */
  readonly secretCodeQualifiers: ReadonlySet<string>;
}
