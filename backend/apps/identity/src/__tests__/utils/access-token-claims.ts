/** Reads the claims of an access token without verifying it, as the app does to learn its session. */
export class AccessTokenClaimsReader {
  static read(token: string): Record<string, unknown> {
    const payload = token.split('.')[1] ?? '';
    return JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as Record<string, unknown>;
  }
}
