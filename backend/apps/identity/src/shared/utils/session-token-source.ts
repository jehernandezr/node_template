import { BearerTokenReader } from '@platform/http';

/**
 * El session token de una petición: el del cuerpo (o la cookie, que el pipe ya copió ahí) o, en la app
 * nativa, el que viaja en `Authorization: Bearer st1_...`.
 */
export function sessionTokenFrom(
  body: string | undefined,
  authorization: string | undefined,
): string | undefined {
  if (body !== undefined) {
    return body;
  }
  const bearer = BearerTokenReader.read(authorization);
  return bearer !== undefined && BearerTokenReader.isSessionToken(bearer)
    ? bearer
    : undefined;
}
