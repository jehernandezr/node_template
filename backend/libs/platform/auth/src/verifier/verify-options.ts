import type { TokenAudience } from '@contracts/identity';

/** Opciones de `AccessTokenVerifier.verify`. */
export interface VerifyOptions {
  /** Destinatario que debe nombrar el claim `aud`. */
  readonly audience: TokenAudience;
}
