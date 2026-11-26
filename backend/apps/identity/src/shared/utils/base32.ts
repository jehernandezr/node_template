const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** RFC 4648 Base32 without padding, as authenticator apps read it in an `otpauth://`. */
export function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/**
 * Decodes RFC 4648 Base32, ignoring case and trailing `=` padding, as authenticator apps read a TOTP secret.
 * @throws RangeError when the text holds a character outside the alphabet.
 */
export function decodeBase32(text: string): Uint8Array {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of text.toUpperCase().replace(/=+$/, '')) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) {
      throw new RangeError('The text is not Base32');
    }
    value = ((value << 5) | index) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Uint8Array.from(bytes);
}
