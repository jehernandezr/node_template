/** AWS credentials used for signing. */
export interface AwsCredentials {
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  /** Present with temporary credentials (Lambda or task role). */
  readonly sessionToken?: string;
}
