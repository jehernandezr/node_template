import { IdentityLimits } from '@contracts/identity';

/** Fixed rules of the access token format. */
export class AccessTokenFormat {
  /** Value of the `typ` header (RFC 9068). */
  static readonly TYPE = 'at+jwt';

  /** Clock skew tolerance when comparing `exp` and `iat`. */
  static readonly CLOCK_SKEW_MS = 30_000;

  /** A longer token is rejected without decoding it. */
  static readonly MAX_LENGTH = IdentityLimits.tokenMaxLength;

  /** Maximum length of the `kid`: bounds what is looked up in the JWKS with data that is not yet verified. */
  static readonly MAX_KID_LENGTH = 128;
}
