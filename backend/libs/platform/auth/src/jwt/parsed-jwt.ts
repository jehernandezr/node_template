/** Un JWT compacto separado en partes, con la firma sin verificar. */
export interface ParsedJwt {
  readonly header: Readonly<Record<string, unknown>>;
  readonly claims: Readonly<Record<string, unknown>>;
  /** `<header>.<payload>` en base64url: lo que se firma. */
  readonly signingInput: string;
  /** Firma ES256 en formato IEEE P1363 (r y s de 32 bytes cada uno). */
  readonly signature: Buffer;
}
