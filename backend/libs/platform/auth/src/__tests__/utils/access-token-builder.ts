import type { AccessTokenClaims } from '@contracts/identity';
import { AuthMethodReference, TokenAudience } from '@contracts/identity';
import { AccessTokenFormat } from '../../jwt/access-token-format.js';
import { JwtAlgorithm } from '../../jwt/jwt-algorithm.enum.js';
import { JwtCodec } from '../../jwt/jwt-codec.js';
import type { TestKeyPair } from './test-key-pair.js';

/**
 * Builds signed access tokens for the tests. The defaults form a
 * valid token with a 10 minute lifetime issued at `issuedAt`; each `with...` method
 * changes only what matters in the test.
 */
export class AccessTokenBuilder {
  private constructor(
    private readonly header: Readonly<Record<string, unknown>>,
    private readonly claims: Readonly<Record<string, unknown>>,
  ) {}

  /**
   * Valid token: `iss` `https://identity.test`, `aud` `api`, `amr` `['pwd']`,
   * `pv` `'1.1'`, `rgn` `'us'`, fixed UUIDv7 ids and `iat`, `auth_time` equal to
   * `issuedAt` (epoch in seconds); `exp` at 600 s and `sxp` at 8 hours.
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

  /** Removes a claim from the payload, to test incomplete tokens. */
  withoutClaim(name: keyof AccessTokenClaims): AccessTokenBuilder {
    const copy: Record<string, unknown> = { ...this.claims };
    delete copy[name];
    return new AccessTokenBuilder(this.header, copy);
  }

  /** Replaces header fields, for example an invalid `alg` or `typ`. */
  withHeader(overrides: Readonly<Record<string, unknown>>): AccessTokenBuilder {
    return new AccessTokenBuilder(
      { ...this.header, ...overrides },
      this.claims,
    );
  }

  /** Returns the compact token signed with the key and the `kid` of `keyPair`. */
  sign(keyPair: TestKeyPair): string {
    return JwtCodec.sign(
      { kid: keyPair.kid, ...this.header },
      this.claims,
      keyPair.privateKey,
    );
  }
}
