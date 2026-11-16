/**
 * Recorre las particiones de las que hay que publicar el outbox sin que
 * messaging conozca la persistencia. Con shards, el adaptador de Postgres
 * entrega una versión que corre `body` una vez por shard.
 */
export abstract class RelayScopes {
  /** Corre `body` una vez por cada partición de la que hay que publicar. */
  abstract forEach(body: () => Promise<void>): Promise<void>;
}
