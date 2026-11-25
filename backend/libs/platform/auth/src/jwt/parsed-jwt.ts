/** A compact JWT split into parts, with the signature unverified. */
export interface ParsedJwt {
  readonly header: Readonly<Record<string, unknown>>;
  readonly claims: Readonly<Record<string, unknown>>;
  /** `<header>.<payload>` in base64url: what is signed. */
  readonly signingInput: string;
  /** ES256 signature in IEEE P1363 format (r and s of 32 bytes each). */
  readonly signature: Buffer;
}
