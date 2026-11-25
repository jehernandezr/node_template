/** State of an `identity_lookup` entry. */
export enum LookupStatus {
  /** The email is taken while the user is created in their shard. */
  Reserved = 'reserved',
  /** The user exists. */
  Active = 'active',
}
