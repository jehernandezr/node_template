/** How the pool authenticates to PostgreSQL (`DB_AUTH`). */
export enum DatabaseAuth {
  /** `DB_PASSWORD` on every connection: local development and tests. */
  Password = 'password',
  /** A fresh IAM token per connection, signed for the endpoint and the user (RDS Proxy and replicas, ADR 0041). */
  Iam = 'iam',
}
