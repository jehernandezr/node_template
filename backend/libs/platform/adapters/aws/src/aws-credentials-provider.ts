import type { AwsCredentials } from './aws-credentials.js';

/** Returns current credentials. Requested on every signature, because temporary ones rotate. */
export abstract class AwsCredentialsProvider {
  /**
   * Resolves the current AWS credentials.
   * @returns The credentials.
   */
  abstract resolve(): Promise<AwsCredentials>;
}
