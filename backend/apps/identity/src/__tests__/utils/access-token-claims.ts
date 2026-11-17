/** Lee los claims de un access token sin verificarlo, como hace la app para conocer su sesión. */
export class AccessTokenClaimsReader {
  static read(token: string): Record<string, unknown> {
    const payload = token.split('.')[1] ?? '';
    return JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as Record<string, unknown>;
  }
}
