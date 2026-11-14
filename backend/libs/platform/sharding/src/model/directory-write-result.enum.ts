/** Resultado de una escritura condicional en el directorio. */
export enum DirectoryWriteResult {
  Written = 'written',
  /** La versión guardada no es la que leyó quien escribe (o el tenant ya existe): releer y reintentar. */
  VersionConflict = 'version-conflict',
  /**
   * El placement rompe la exclusividad de un shard: un tenant dedicado
   * compartiría shard, o un tenant caería en un shard de un dedicado. Hay que
   * correr de nuevo la política de placement con datos frescos.
   */
  ShardTaken = 'shard-taken',
}
