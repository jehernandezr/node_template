/** How a connection authenticates. */
export enum ValkeyAuthMode {
  /** No `AUTH`, like the local docker compose server. */
  None = 'none',
  /** ElastiCache IAM token for a replication group. */
  Iam = 'iam',
  /** ElastiCache IAM token for a serverless cache, the one Terraform creates. */
  IamServerless = 'iam-serverless',
}
