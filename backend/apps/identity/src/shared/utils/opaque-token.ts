import { decodeBase64Url, encodeBase64Url } from './base64url.js';

const SEPARATOR = '_';

/** Parts of an already parsed opaque token: the route to its row and the raw secret. */
export interface OpaqueToken {
  readonly route: string[];
  readonly secret: Buffer;
}

/**
 * Builds `<prefix>_<route>_<secret>`. The route says where the row is (for example the tenant id),
 * so no part can be empty or contain `_`, which is the separator.
 * @throws Error if a part of the route is empty or contains `_`.
 */
export function encodeOpaqueToken(
  prefix: string,
  route: readonly string[],
  secret: Uint8Array,
): string {
  for (const part of route) {
    if (part.length === 0 || part.includes(SEPARATOR)) {
      throw new Error(`Invalid opaque token route part: "${part}"`);
    }
  }
  return [prefix, ...route, encodeBase64Url(secret)].join(SEPARATOR);
}

/**
 * Reads a token built with `encodeOpaqueToken`. The secret's base64url may contain `_`, so
 * the secret is everything left after the route.
 * @returns `undefined` if the prefix does not match, parts are missing or the secret is not valid base64url.
 */
export function parseOpaqueToken(
  token: string,
  prefix: string,
  routeParts: number,
): OpaqueToken | undefined {
  const segments = token.split(SEPARATOR);
  if (segments.length < routeParts + 2 || segments[0] !== prefix) {
    return undefined;
  }
  const route = segments.slice(1, 1 + routeParts);
  const encoded = segments.slice(1 + routeParts).join(SEPARATOR);
  try {
    const secret = decodeBase64Url(encoded);
    return secret.byteLength === 0 ? undefined : { route, secret };
  } catch {
    return undefined;
  }
}
