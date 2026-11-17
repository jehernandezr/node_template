import {
  encodeOpaqueToken,
  parseOpaqueToken,
} from '../../../shared/utils/opaque-token.js';

/**
 * Token de recuperación `pr1_<usuario>_<tenant de origen>_<recuperación>_<secreto>`. La ruta lleva a la
 * fila en el shard del usuario sin consultar el catálogo; la base guarda solo la huella del secreto.
 */
export class PasswordResetToken {
  static readonly PREFIX = 'pr1';
  private static readonly ROUTE_PARTS = 3;

  constructor(
    readonly userId: string,
    readonly homeTenantId: string,
    readonly resetId: string,
    readonly secret: Buffer,
  ) {}

  /** `undefined` si el texto no es un token de recuperación bien formado. */
  static parse(text: string): PasswordResetToken | undefined {
    const parsed = parseOpaqueToken(
      text,
      PasswordResetToken.PREFIX,
      PasswordResetToken.ROUTE_PARTS,
    );
    const [userId, homeTenantId, resetId] = parsed?.route ?? [];
    if (
      parsed === undefined ||
      userId === undefined ||
      homeTenantId === undefined ||
      resetId === undefined
    ) {
      return undefined;
    }
    return new PasswordResetToken(userId, homeTenantId, resetId, parsed.secret);
  }

  format(): string {
    return encodeOpaqueToken(
      PasswordResetToken.PREFIX,
      [this.userId, this.homeTenantId, this.resetId],
      this.secret,
    );
  }
}
