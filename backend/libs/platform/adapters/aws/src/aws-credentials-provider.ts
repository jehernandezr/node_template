import type { AwsCredentials } from './aws-credentials.js';

/** Returns current credentials. Requested on every signature, because temporary ones rotate. */
export abstract class AwsCredentialsProvider {
  abstract resolve(): Promise<AwsCredentials>;
}
