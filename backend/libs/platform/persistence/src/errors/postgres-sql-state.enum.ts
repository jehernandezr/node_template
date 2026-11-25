/** Postgres SQLSTATEs that the code distinguishes by meaning, not only by whether they are retried. */
export enum PostgresSqlState {
  /** Another row already has that unique key. */
  UniqueViolation = '23505',
  /** The row points to a parent that does not exist, or a parent with children is deleted. */
  ForeignKeyViolation = '23503',
}
