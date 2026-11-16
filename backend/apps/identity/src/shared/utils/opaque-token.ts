import { decodeBase64Url, encodeBase64Url } from './base64url.js';

const SEPARATOR = '_';

/** Partes de un token opaco ya leído: la ruta hacia su fila y el secreto crudo. */
export interface OpaqueToken {
  readonly route: string[];
  readonly secret: Buffer;
}

/**
 * Arma `<prefijo>_<ruta>_<secreto>`. La ruta dice dónde está la fila (por ejemplo el id del tenant),
 * así que cada parte no puede estar vacía ni contener `_`, que es el separador.
 * @throws Error si una parte de la ruta está vacía o contiene `_`.
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
 * Lee un token armado con `encodeOpaqueToken`. El base64url del secreto puede contener `_`, así que
 * el secreto es todo lo que queda después de la ruta.
 * @returns `undefined` si el prefijo no coincide, faltan partes o el secreto no es base64url válido.
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
