/** Nombres de la publicación, el slot y la suscripción de un traslado: los tres iguales, derivados del traslado. */
export class ReplicationNames {
  private static readonly PREFIX = 'tenant_move_';

  /** Solo letras minúsculas, dígitos y `_`, así el nombre va sin comillas en el SQL. */
  static of(moveId: string): string {
    return `${ReplicationNames.PREFIX}${moveId.toLowerCase().replace(/[^0-9a-f]/g, '')}`;
  }
}
