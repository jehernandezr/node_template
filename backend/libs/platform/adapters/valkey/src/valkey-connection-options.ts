interface ValkeyConnectionCommon {
  /** Usuario de la ACL. Sin él la conexión se autentica como `default`. */
  readonly username?: string;
  /** Tiempo para establecer una conexión. */
  readonly connectTimeoutMs?: number;
  /** Cota de un comando en el cliente. */
  readonly commandTimeoutMs?: number;
  /** Nombre que muestra `CLIENT LIST`. */
  readonly connectionName?: string;
}

/** Datos de una conexión: una URL (local) o host, puerto y TLS (AWS). */
export type ValkeyConnectionOptions = ValkeyConnectionCommon &
  (
    | {
        /** URL `redis://` o `rediss://` (TLS), por ejemplo `VALKEY_URL`. */
        readonly url: string;
      }
    | {
        readonly host: string;
        readonly port: number;
        /** ElastiCache serverless solo acepta TLS. */
        readonly tls: boolean;
      }
  );
