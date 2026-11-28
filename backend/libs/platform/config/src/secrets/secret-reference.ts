/** Where the value of one environment variable lives in the secret store. */
export interface SecretReference {
  /** Environment variable that receives the value, for example `IDENTITY_DATA_KEY`. */
  readonly variable: string;
  /** ARN of the secret, without a JSON key. */
  readonly secretId: string;
  /** Key of the JSON object the secret holds; absent when the whole secret text is the value. */
  readonly jsonKey?: string;
}
