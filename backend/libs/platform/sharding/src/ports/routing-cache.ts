/** Caché compartido entre procesos (por ejemplo Valkey). Los valores son cadenas JSON. */
export abstract class RoutingCache {
  abstract get(key: string): Promise<string | undefined>;

  /**
   * Escribe solo si la clave no existe, expiró o la versión guardada es menor;
   * una versión igual se rechaza. Debe ser atómica: `ShardRouter` depende de
   * ello para que una lápida no la pise un placement más viejo.
   * @returns `true` si escribió.
   */
  abstract setIfNewer(
    key: string,
    value: string,
    version: number,
    ttlMs: number,
  ): Promise<boolean>;

  /** Borra la clave. `ShardRouter` no la llama: las invalidaciones escriben una lápida versionada. */
  abstract delete(key: string): Promise<void>;
}
