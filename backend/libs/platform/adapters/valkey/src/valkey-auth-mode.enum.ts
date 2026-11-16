/** Cómo se autentica una conexión. */
export enum ValkeyAuthMode {
  /** Sin `AUTH`, como el servidor local de docker compose. */
  None = 'none',
  /** Token IAM de ElastiCache para un grupo de replicación. */
  Iam = 'iam',
  /** Token IAM de ElastiCache para una caché serverless, la que crea Terraform. */
  IamServerless = 'iam-serverless',
}
