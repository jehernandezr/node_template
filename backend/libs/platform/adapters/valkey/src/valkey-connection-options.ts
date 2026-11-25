interface ValkeyConnectionCommon {
  /** ACL user. Without it the connection authenticates as `default`. */
  readonly username?: string;
  /** Time to establish a connection. */
  readonly connectTimeoutMs?: number;
  /** Client-side bound of a command. */
  readonly commandTimeoutMs?: number;
  /** Name shown by `CLIENT LIST`. */
  readonly connectionName?: string;
}

/** Connection data: a URL (local) or host, port and TLS (AWS). */
export type ValkeyConnectionOptions = ValkeyConnectionCommon &
  (
    | {
        /** `redis://` or `rediss://` (TLS) URL, for example `VALKEY_URL`. */
        readonly url: string;
      }
    | {
        readonly host: string;
        readonly port: number;
        /** ElastiCache serverless only accepts TLS. */
        readonly tls: boolean;
      }
  );
