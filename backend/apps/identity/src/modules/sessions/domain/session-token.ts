import {
  encodeOpaqueToken,
  parseOpaqueToken,
} from '../../../shared/utils/opaque-token.js';

/**
 * Session token opaco `st1_<usuario>_<tenant de origen>_<sesión>_<generación>_<secreto>`. La ruta lleva a la
 * fila sin consultar el catálogo; el secreto de cada generación se deriva de la sal de la sesión.
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

  /** `undefined` si el texto no es un session token bien formado. */
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
