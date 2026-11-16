/** Credenciales de AWS con las que se firma. */
export interface AwsCredentials {
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  /** Presente con credenciales temporales (rol de Lambda o de la tarea). */
  readonly sessionToken?: string;
}
