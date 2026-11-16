const BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/;

/** Codifica bytes en base64url sin relleno. */
export function encodeBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

/**
 * Decodifica base64url sin relleno.
 * @throws Error si el texto tiene caracteres fuera del alfabeto base64url (incluido el `+`, `/` o `=`).
 */
export function decodeBase64Url(text: string): Buffer {
  if (!BASE64URL_PATTERN.test(text)) {
    throw new Error('Invalid base64url text');
  }
  return Buffer.from(text, 'base64url');
}
