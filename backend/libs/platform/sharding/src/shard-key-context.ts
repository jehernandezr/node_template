/** Quién pregunta, tal como lo conoce el contexto de la petición. */
export interface ShardKeyContext {
  readonly tenantId: string;
  /** Lo exige `ShardKey.User`. */
  readonly userId?: string;
}
