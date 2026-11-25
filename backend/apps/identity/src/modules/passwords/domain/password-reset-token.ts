import {
  encodeOpaqueToken,
  parseOpaqueToken,
} from '../../../shared/utils/opaque-token.js';

/**
 * Recovery token `pr1_<user>_<home tenant>_<recovery>_<secret>`. The route leads to the
 * row in the user's shard without querying the catalog; the database stores only the secret's hash.
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

  /** `undefined` if the text is not a well-formed recovery token. */
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
