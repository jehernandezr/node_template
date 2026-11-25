const BASE64URL_PATTERN = /^[A-Za-z0-9_-]*$/;

/** Encodes bytes in base64url without padding. */
export function encodeBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

/**
 * Decodes base64url without padding.
 * @throws Error if the text has characters outside the base64url alphabet (including `+`, `/` or `=`).
 */
export function decodeBase64Url(text: string): Buffer {
  if (!BASE64URL_PATTERN.test(text)) {
    throw new Error('Invalid base64url text');
  }
  return Buffer.from(text, 'base64url');
}
