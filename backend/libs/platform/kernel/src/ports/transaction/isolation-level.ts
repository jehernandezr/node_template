/** Isolation level of a transaction. */
export enum IsolationLevel {
  ReadCommitted = 'READ COMMITTED',
  RepeatableRead = 'REPEATABLE READ',
  Serializable = 'SERIALIZABLE',
}
