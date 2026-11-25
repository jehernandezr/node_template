/** Límites y plazos de las operaciones que ubican un tenant en el directorio de shards de un servicio. */
export const TenantDirectoryLimits = {
  /** Largo máximo del identificador de una región o de un grupo de shards. */
  fieldMaxLength: 64,
  /** Grupos de shards de un tenant; el tenant compartido de clientes ocupa todos los de su región. */
  maxGroups: 64,
  /** Plazo de la escritura de una fila del directorio. */
  placeTimeoutMs: 5_000,
  /** Plazo del retiro de una fila del directorio. */
  removeTimeoutMs: 5_000,
} as const;
