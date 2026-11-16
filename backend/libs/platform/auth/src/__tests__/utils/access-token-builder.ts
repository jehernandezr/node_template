import type { AccessTokenClaims } from '@contracts/identity';
import { AuthMethodReference, TokenAudience } from '@contracts/identity';
import { AccessTokenFormat } from '../../jwt/access-token-format.js';
import { JwtAlgorithm } from '../../jwt/jwt-algorithm.enum.js';
import { JwtCodec } from '../../jwt/jwt-codec.js';
import type { TestKeyPair } from './test-key-pair.js';

/**
 * Arma access tokens firmados para las pruebas. Los valores por defecto forman un
 * token válido de 10 minutos de vida emitido en `issuedAt`; cada método `with...`
 * cambia solo lo que importa en la prueba.
 */
export class AccessTokenBuilder {
  private constructor(
    private readonly header: Readonly<Record<string, unknown>>,
    private readonly claims: Readonly<Record<string, unknown>>,
  ) {}

  /**
   * Token válido: `iss` `https://identity.test`, `aud` `api`, `amr` `['pwd']`,
   * `pv` `'1.1'`, `rgn` `'us'`, ids UUIDv7 fijos y `iat`, `auth_time` igual a
   * `issuedAt` (epoch en segundos); `exp` a 600 s y `sxp` a 8 horas.
   */
  static aToken(issuedAt: number): AccessTokenBuilder {
    return new AccessTokenBuilder(
      { alg: JwtAlgorithm.Es256, typ: AccessTokenFormat.TYPE },
      {
        iss: 'https://identity.test',
        aud: TokenAudience.Api,
        sub: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f01',
        tid: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f02',
        htid: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f03',
        sid: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f04',
        amr: [AuthMethodReference.Password],
        auth_time: issuedAt,
        roles: [],
        proles: [],
        pv: '1.1',
        rgn: 'us',
        sxp: issuedAt + 28_800,
        iat: issuedAt,
        exp: issuedAt + 600,
        jti: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f05',
      },
    );
  }

  withClaims(overrides: Partial<AccessTokenClaims>): AccessTokenBuilder {
    return new AccessTokenBuilder(this.header, {
      ...this.claims,
      ...overrides,
    });
  }

  /** Quita un claim del payload, para probar tokens incompletos. */
  withoutClaim(name: keyof AccessTokenClaims): AccessTokenBuilder {
    const copy: Record<string, unknown> = { ...this.claims };
    delete copy[name];
    return new AccessTokenBuilder(this.header, copy);
  }

  /** Reemplaza campos del header, por ejemplo `alg` o `typ` inválidos. */
  withHeader(overrides: Readonly<Record<string, unknown>>): AccessTokenBuilder {
    return new AccessTokenBuilder(
      { ...this.header, ...overrides },
      this.claims,
    );
  }

  /** Token compacto firmado con la clave y el `kid` de `keyPair`. */
  sign(keyPair: TestKeyPair): string {
    return JwtCodec.sign(
      { kid: keyPair.kid, ...this.header },
      this.claims,
      keyPair.privateKey,
    );
  }
}
