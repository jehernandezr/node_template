/** Available automatic instrumentations. */
export enum TelemetryInstrumentation {
  Http = 'http',
  /** Native Node `fetch` (undici). */
  Fetch = 'fetch',
  Pg = 'pg',
  /** Valkey client (`iovalkey`). */
  Valkey = 'valkey',
  AwsSdk = 'aws-sdk',
  NestJs = 'nestjs',
}
