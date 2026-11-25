import { BearerTokenReader } from '@platform/http';

/**
 * The session token of a request: the one in the body (or the cookie, which the pipe already copied there) or, in the native
 * app, the one that travels in `Authorization: Bearer st1_...`.
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
