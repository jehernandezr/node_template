/** Para qué se pide un `EntityManager`. Decide primario o réplica y si hace falta transacción. */
export enum ManagerIntent {
  /** Lectura: dentro de una transacción usa su sesión; fuera, va a la réplica del shard. */
  Read = 'read',
  /** Lectura que debe ver lo recién confirmado: va al primario. */
  ReadPrimary = 'read-primary',
  /** Escritura: siempre dentro de una transacción del primario. */
  Write = 'write',
}
