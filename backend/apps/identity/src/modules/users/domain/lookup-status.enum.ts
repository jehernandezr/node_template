/** Estado de una entrada de `identity_lookup`. */
export enum LookupStatus {
  /** El email está tomado mientras se crea el usuario en su shard. */
  Reserved = 'reserved',
  /** El usuario existe. */
  Active = 'active',
}
