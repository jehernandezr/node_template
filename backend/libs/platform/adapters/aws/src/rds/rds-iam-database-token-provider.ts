import type { Clock } from '@platform/kernel';
import {
  DatabaseTokenProvider,
  type DatabaseTokenRequest,
} from '@platform/persistence';
import { SignatureV4 } from '@smithy/signature-v4';
import type { AwsCredentialsProvider } from '../aws-credentials-provider.js';
import { NodeSha256 } from '../sigv4/node-sha256.js';

/**
 * RDS signer: the password of each connection is an IAM authentication token for RDS Proxy or a replica (ADR 0041).
 * The token is `GET https://<host>:<port>/?Action=connect&DBUser=<user>` presigned with SigV4 for the `rds-db`
 * service, without the scheme, and lasts 15 minutes. The pool asks on every new connection, so an expired token is
 * never presented; temporary credentials of the task or function role are resolved on every signature.
 */
export class RdsIamDatabaseTokenProvider extends DatabaseTokenProvider {
  /** Lifetime of an RDS IAM token: 15 minutes. */
  static readonly TOKEN_TTL_SECONDS = 900;

  private static readonly SERVICE = 'rds-db';
  private static readonly ACTION = 'connect';

  private readonly signer: SignatureV4;

  /** @param region Region of the database, the one in `AWS_REGION`. */
  constructor(
    region: string,
    credentials: AwsCredentialsProvider,
    private readonly clock: Clock,
  ) {
    super();
    this.signer = new SignatureV4({
      service: RdsIamDatabaseTokenProvider.SERVICE,
      region,
      sha256: NodeSha256,
      credentials: () => credentials.resolve(),
    });
  }

  /**
   * Signs a token for the host, port and user of one connection.
   * @param request Host, port and database user.
   * @returns The token, `<host>:<port>/?Action=connect&DBUser=<user>&X-Amz-...`.
   */
  override async token(request: DatabaseTokenRequest): Promise<string> {
    const { host, port, user } = request;
    const signed = await this.signer.presign(
      {
        method: 'GET',
        protocol: 'https:',
        hostname: host,
        port,
        path: '/',
        query: { Action: RdsIamDatabaseTokenProvider.ACTION, DBUser: user },
        headers: { host: `${host}:${port}` },
      },
      {
        expiresIn: RdsIamDatabaseTokenProvider.TOKEN_TTL_SECONDS,
        signingDate: this.clock.now(),
      },
    );
    const query = Object.entries(signed.query ?? {})
      .flatMap(([key, value]) =>
        (Array.isArray(value) ? value : [value]).map(
          (item) => `${this.encode(key)}=${this.encode(String(item))}`,
        ),
      )
      .join('&');
    return `${host}:${port}/?${query}`;
  }

  /** SigV4 encoding: everything except `A-Z a-z 0-9 - _ . ~`, in uppercase. */
  private encode(value: string): string {
    return encodeURIComponent(value).replace(
      /[!'()*]/g,
      (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    );
  }
}
