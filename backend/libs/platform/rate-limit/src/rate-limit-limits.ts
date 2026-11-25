/** Caps that a rule and a call accept. */
export class RateLimitLimits {
  /**
   * Shape of a rule name. Without `:` or braces, because the name goes into
   * the Valkey keys and their hash tag.
   */
  static readonly RULE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
  /** Largest limit that a rule accepts. */
  static readonly MAX_LIMIT = 1_000_000;
  /** Largest window that a rule accepts: 30 days. */
  static readonly MAX_WINDOW_MS = 30 * 24 * 60 * 60 * 1_000;
  /** Maximum length, in characters, of the key that is limited. */
  static readonly MAX_KEY_LENGTH = 512;
}
