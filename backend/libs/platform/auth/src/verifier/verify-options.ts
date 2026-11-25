import type { TokenAudience } from '@contracts/identity';

/** Options of `AccessTokenVerifier.verify`. */
export interface VerifyOptions {
  /** Audience that the `aud` claim must name. */
  readonly audience: TokenAudience;
}
