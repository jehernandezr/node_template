import {
  encodeOpaqueToken,
  parseOpaqueToken,
} from '../../../shared/utils/opaque-token.js';

/**
 * Opaque session token `st1_<user>_<home tenant>_<session>_<generation>_<secret>`. The route leads to the
 * row without querying the catalog; the secret of each generation is derived from the session's salt.
 */
export class SessionToken {
  static readonly PREFIX = 'st1';
  private static readonly ROUTE_PARTS = 4;
  private static readonly GENERATION = /^\d{1,9}$/;

  constructor(
    readonly userId: string,
    readonly homeTenantId: string,
    readonly sessionId: string,
    readonly generation: number,
    readonly secret: Buffer,
  ) {}

  /** `undefined` if the text is not a well-formed session token. */
  static parse(text: string): SessionToken | undefined {
    const parsed = parseOpaqueToken(
      text,
      SessionToken.PREFIX,
      SessionToken.ROUTE_PARTS,
    );
    if (parsed === undefined) {
      return undefined;
    }
    const [userId, homeTenantId, sessionId, generation] = parsed.route;
    if (
      userId === undefined ||
      homeTenantId === undefined ||
      sessionId === undefined ||
      generation === undefined ||
      !SessionToken.GENERATION.test(generation)
    ) {
      return undefined;
    }
    return new SessionToken(
      userId,
      homeTenantId,
      sessionId,
      Number(generation),
      parsed.secret,
    );
  }

  format(): string {
    return encodeOpaqueToken(
      SessionToken.PREFIX,
      [this.userId, this.homeTenantId, this.sessionId, String(this.generation)],
      this.secret,
    );
  }
}
