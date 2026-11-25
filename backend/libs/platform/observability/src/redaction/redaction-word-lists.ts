/** Word lists (lowercase) that `Redactor` uses to decide which keys are sensitive. */
export interface RedactionWordLists {
  /** Words that, as the last word of the key, name the secret itself (`accessToken`). */
  readonly sensitiveLastWords: ReadonlySet<string>;
  /** Words that, at the start of the key, announce a secret value (`passwordConfirmation`). */
  readonly sensitiveFirstWords: ReadonlySet<string>;
  /** Last words that never carry a secret: ids, instants and counts (`sessionId`). */
  readonly publicLastWords: ReadonlySet<string>;
  /** Hash or digest words (`tokenHash`, `codeHmac`). */
  readonly digestWords: ReadonlySet<string>;
  /** Secrets whose hash or digest is also sensitive. */
  readonly digestedSecrets: ReadonlySet<string>;
  /** Compound names that only make sense together (`privatekey`, `signingkey`). */
  readonly sensitiveCompounds: ReadonlySet<string>;
  /** The words `code` and `codes`, sensitive only if qualified by one of `secretCodeQualifiers`. */
  readonly codeWords: ReadonlySet<string>;
  /** Qualifiers that make a `code` secret (`mfa`, `verification`, `otp`, `reset`). */
  readonly secretCodeQualifiers: ReadonlySet<string>;
}
