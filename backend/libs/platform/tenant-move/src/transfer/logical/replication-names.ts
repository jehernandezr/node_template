/** Names of a move's publication, slot and subscription: all three equal, derived from the move. */
export class ReplicationNames {
  private static readonly PREFIX = 'tenant_move_';

  /** Only lowercase letters, digits and `_`, so the name goes unquoted in SQL. */
  static of(moveId: string): string {
    return `${ReplicationNames.PREFIX}${moveId.toLowerCase().replace(/[^0-9a-f]/g, '')}`;
  }
}
