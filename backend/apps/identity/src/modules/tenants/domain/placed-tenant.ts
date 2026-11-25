/** Dónde quedó un tenant en el directorio de shards de identity. */
export interface PlacedTenant {
  readonly region: string;
  /** Los shards lógicos de identity del tenant. */
  readonly shards: readonly string[];
  readonly dedicated: boolean;
}
