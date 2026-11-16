/** Instrumentaciones automáticas disponibles. */
export enum TelemetryInstrumentation {
  Http = 'http',
  /** `fetch` nativo de Node (undici). */
  Fetch = 'fetch',
  Pg = 'pg',
  /** Cliente de Valkey (`iovalkey`). */
  Valkey = 'valkey',
  AwsSdk = 'aws-sdk',
  NestJs = 'nestjs',
}
