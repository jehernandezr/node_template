import { sign, verify } from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import { AuthenticationError } from '../errors/authentication.error.js';
import type { AccessTokenHeader } from './access-token-header.js';
import type { ParsedJwt } from './parsed-jwt.js';

/** Codifica, separa y firma JWT compactos con ES256 sobre `node:crypto`. Utilidad pura, sin estado. */
export class JwtCodec {
  /** Cada parte del token es base64url sin relleno. */
  private static readonly SEGMENT = /^[A-Za-z0-9_-]+$/;

  /** Una firma ES256 en formato IEEE P1363 mide siempre r y s de 32 bytes. */
  private static readonly SIGNATURE_BYTES = 64;

  /**
   * `<header>.<claims>.<firma>` en base64url. Firma con SHA-256 y
   * `dsaEncoding: 'ieee-p1363'`, el formato que exige JWS para ES256.
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
   * Separa un JWT compacto sin verificar la firma.
   * @throws AuthenticationError (`PLATFORM.AUTH.UNAUTHENTICATED`) si no tiene tres partes base64url, si el header o los claims no son un objeto JSON o si la firma no mide 64 bytes.
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

  /** Verifica la firma ES256 de un token ya separado con la clave pública. Nunca lanza por una firma incorrecta: devuelve `false`. */
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
