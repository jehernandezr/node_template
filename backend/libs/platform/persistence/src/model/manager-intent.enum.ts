/** What an `EntityManager` is requested for. Decides primary or replica and whether a transaction is needed. */
export enum ManagerIntent {
  /** Read: inside a transaction it uses its session; outside, it goes to the shard replica. */
  Read = 'read',
  /** Read that must see what was just committed: goes to the primary. */
  ReadPrimary = 'read-primary',
  /** Write: always inside a primary transaction. */
  Write = 'write',
}
