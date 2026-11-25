import { sign, verify } from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import { AuthenticationError } from '../errors/authentication.error.js';
import type { AccessTokenHeader } from './access-token-header.js';
import type { ParsedJwt } from './parsed-jwt.js';

/** Encodes, splits and signs compact JWTs with ES256 on `node:crypto`. Pure stateless utility. */
export class JwtCodec {
  /** Each part of the token is base64url without padding. */
  private static readonly SEGMENT = /^[A-Za-z0-9_-]+$/;

  /** An ES256 signature in IEEE P1363 format always has r and s of 32 bytes. */
  private static readonly SIGNATURE_BYTES = 64;

  /**
   * Returns `<header>.<claims>.<signature>` in base64url. Signs with SHA-256 and
   * `dsaEncoding: 'ieee-p1363'`, the format JWS requires for ES256.
   */
  static sign(
    header: AccessTokenHeader | Readonly<Record<string, unknown>>,
    claims: object,
    privateKey: KeyObject,
  ): string {
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
      'base64url',
    );
    const encodedClaims = Buffer.from(JSON.stringify(claims)).toString(
      'base64url',
    );
    const signingInput = `${encodedHeader}.${encodedClaims}`;
    const signature = sign('sha256', Buffer.from(signingInput), {
      key: privateKey,
      dsaEncoding: 'ieee-p1363',
    });
    return `${signingInput}.${signature.toString('base64url')}`;
  }

  /**
   * Splits a compact JWT without verifying the signature.
   * @throws AuthenticationError (`PLATFORM.AUTH.UNAUTHENTICATED`) if it does not have three base64url parts, if the header or the claims are not a JSON object or if the signature is not 64 bytes.
   */
  static parse(token: string): ParsedJwt {
    const parts = token.split('.');
    if (
      parts.length !== 3 ||
      parts.some((part) => !JwtCodec.SEGMENT.test(part))
    ) {
      throw AuthenticationError.unauthenticated('malformed token');
    }
    const [encodedHeader, encodedClaims, encodedSignature] = parts;
    const header = JwtCodec.decodeObject(encodedHeader);
    const claims = JwtCodec.decodeObject(encodedClaims);
    const signature = Buffer.from(encodedSignature, 'base64url');
    if (
      signature.length !== JwtCodec.SIGNATURE_BYTES ||
      signature.toString('base64url') !== encodedSignature
    ) {
      throw AuthenticationError.unauthenticated('malformed token');
    }
    return {
      header,
      claims,
      signingInput: `${encodedHeader}.${encodedClaims}`,
      signature,
    };
  }

  /** Verifies the ES256 signature of an already split token with the public key. It never throws for a wrong signature: it returns `false`. */
  static verifySignature(parsed: ParsedJwt, publicKey: KeyObject): boolean {
    try {
      return verify(
        'sha256',
        Buffer.from(parsed.signingInput),
        { key: publicKey, dsaEncoding: 'ieee-p1363' },
        parsed.signature,
      );
    } catch {
      return false;
    }
  }

  private static decodeObject(segment: string): Record<string, unknown> {
    let value: unknown;
    try {
      value = JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
    } catch {
      throw AuthenticationError.unauthenticated('malformed token');
    }
    if (!JwtCodec.isRecord(value)) {
      throw AuthenticationError.unauthenticated('malformed token');
    }
    return value;
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
