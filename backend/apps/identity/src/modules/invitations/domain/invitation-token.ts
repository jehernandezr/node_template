import {
  encodeOpaqueToken,
  parseOpaqueToken,
} from '../../../shared/utils/opaque-token.js';

/** Token `iv1_<tenant>_<secret>`: the route leads to the tenant's shard without querying the catalog. */
export class InvitationToken {
  static readonly PREFIX = 'iv1';

  constructor(
    readonly tenantId: string,
    readonly secret: Buffer,
  ) {}

  static parse(text: string): InvitationToken | undefined {
    const parsed = parseOpaqueToken(text, InvitationToken.PREFIX, 1);
    const tenantId = parsed?.route[0];
    return parsed === undefined || tenantId === undefined
      ? undefined
      : new InvitationToken(tenantId, parsed.secret);
  }

  format(): string {
    return encodeOpaqueToken(
      InvitationToken.PREFIX,
      [this.tenantId],
      this.secret,
    );
  }
}
