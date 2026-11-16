import type { AwsCredentials } from './aws-credentials.js';

/** Entrega credenciales vigentes. Se pide en cada firma, porque las temporales rotan. */
export abstract class AwsCredentialsProvider {
  abstract resolve(): Promise<AwsCredentials>;
}
