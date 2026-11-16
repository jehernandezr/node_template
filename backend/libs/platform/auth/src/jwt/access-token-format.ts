import { IdentityLimits } from '@contracts/identity';

/** Reglas fijas del formato del access token. */
export class AccessTokenFormat {
  /** Valor del header `typ` (RFC 9068). */
  static readonly TYPE = 'at+jwt';

  /** Tolerancia entre relojes al comparar `exp` e `iat`. */
  static readonly CLOCK_SKEW_MS = 30_000;

  /** Un token más largo se rechaza sin decodificarlo. */
  static readonly MAX_LENGTH = IdentityLimits.tokenMaxLength;

  /** Largo máximo del `kid`: acota lo que se busca en el JWKS con un dato que aún no está verificado. */
  static readonly MAX_KID_LENGTH = 128;
}
