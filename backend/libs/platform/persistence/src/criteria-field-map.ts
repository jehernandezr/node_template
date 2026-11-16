/**
 * Los campos de una entidad que un criterio puede filtrar u ordenar. Cualquier otro nombre se rechaza,
 * así un valor que llega de fuera nunca llega a la sentencia como identificador.
 */
export class CriteriaFieldMap {
  /** @param alias alias de la entidad en el `SelectQueryBuilder`. @param properties nombres de propiedad permitidos. @param idField propiedad del desempate de la paginación, por defecto `id`. */
  constructor(
    readonly alias: string,
    readonly properties: readonly string[],
    readonly idField = 'id',
  ) {}
}
