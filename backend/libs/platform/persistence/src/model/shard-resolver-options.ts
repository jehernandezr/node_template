/** Opciones de `ShardResolver`. */
export interface ShardResolverOptions {
  /** Con `true`, sin un `ShardScope` activo toda resolución falla con `PLATFORM.SHARDING.KEY_MISSING`. */
  readonly requireScope: boolean;
}
