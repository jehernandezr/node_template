import { createHash, createHmac } from 'node:crypto';
import type { Clock } from '@platform/kernel';
import type { AwsCredentials } from './aws-credentials.js';
import type { AwsCredentialsProvider } from './aws-credentials-provider.js';

/**
 * Identity that signs the token. `ValkeyModule` builds it from its own
 * variables (`VALKEY_USER`, `VALKEY_CACHE_NAME`, `VALKEY_AUTH`) and passes it on
 * each call, so that data is not declared twice.
 */
export interface ElastiCacheIamAuthRequest {
  /** ElastiCache user. With IAM authentication its id and its name match. */
  readonly userId: string;
  /**
   * Name of the serverless cache or the replication group. It is the host of the
   * signed request, not the connection endpoint.
   */
  readonly cacheName: string;
  /** The cache is serverless: the token declares it with `ResourceType`. */
  readonly serverless: boolean;
}

/**
 * Provider of the IAM token an ElastiCache user authenticates with
 * (`AUTH <user> <token>`). The token is a `connect` request presigned with
 * SigV4 and is valid for 15 minutes: the Valkey client requests a new one on each
 * connection and reconnection, so it never presents an expired one. It satisfies the
 * `ValkeyAuthTokenProvider` port by shape, without `aws` depending on `valkey`.
 */
export class ElastiCacheIamAuthTokenProvider {
  /** Lifetime of the ElastiCache IAM token: 15 minutes. */
  static readonly TOKEN_TTL_SECONDS = 900;

  private static readonly ALGORITHM = 'AWS4-HMAC-SHA256';
  private static readonly SERVICE = 'elasticache';
  /** SHA-256 of the empty body: the signed request is a GET without a body. */
  private static readonly EMPTY_PAYLOAD_SHA256 =
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  /** @param region Region of the cache, the one in `AWS_REGION`. */
  constructor(
    private readonly region: string,
    private readonly credentials: AwsCredentialsProvider,
    private readonly clock: Clock,
  ) {}

  /**
   * Current token for that identity, signed with the credentials of this instant.
   * @param request User, cache and region.
   * @returns The token.
   */
  async token(request: ElastiCacheIamAuthRequest): Promise<string> {
    return this.sign(
      request,
      await this.credentials.resolve(),
      this.clock.now(),
    );
  }

  /**
   * Signs the token for a given instant. It is the SigV4 presignature of
   * `GET http://<cacheName>/?Action=connect&User=<userId>` without the scheme.
   * @param request User, cache and region.
   * @param credentials AWS credentials.
   * @param now Instant of the signature.
   * @returns The token.
   */
  sign(
    request: ElastiCacheIamAuthRequest,
    credentials: AwsCredentials,
    now: Date,
  ): string {
    const { region } = this;
    const { cacheName, userId, serverless } = request;
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const date = amzDate.slice(0, 8);
    const scope = `${date}/${region}/${ElastiCacheIamAuthTokenProvider.SERVICE}/aws4_request`;

    const query: [string, string][] = [
      ['Action', 'connect'],
      ['User', userId],
      ['X-Amz-Algorithm', ElastiCacheIamAuthTokenProvider.ALGORITHM],
      ['X-Amz-Credential', `${credentials.accessKeyId}/${scope}`],
      ['X-Amz-Date', amzDate],
      [
        'X-Amz-Expires',
        String(ElastiCacheIamAuthTokenProvider.TOKEN_TTL_SECONDS),
      ],
      ['X-Amz-SignedHeaders', 'host'],
    ];
    if (serverless) {
      query.push(['ResourceType', 'ServerlessCache']);
    }
    if (credentials.sessionToken !== undefined) {
      query.push(['X-Amz-Security-Token', credentials.sessionToken]);
    }
    const canonicalQuery = query
      .map(([key, value]) => [this.encode(key), this.encode(value)])
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    const canonicalRequest = [
      'GET',
      '/',
      canonicalQuery,
      `host:${cacheName}\n`,
      'host',
      ElastiCacheIamAuthTokenProvider.EMPTY_PAYLOAD_SHA256,
    ].join('\n');
    const stringToSign = [
      ElastiCacheIamAuthTokenProvider.ALGORITHM,
      amzDate,
      scope,
      this.sha256Hex(canonicalRequest),
    ].join('\n');

    let key = this.hmac(`AWS4${credentials.secretAccessKey}`, date);
    for (const part of [
      region,
      ElastiCacheIamAuthTokenProvider.SERVICE,
      'aws4_request',
    ]) {
      key = this.hmac(key, part);
    }
    const signature = this.hmac(key, stringToSign).toString('hex');

    return `${cacheName}/?${canonicalQuery}&X-Amz-Signature=${signature}`;
  }

  /** SigV4 encoding: everything except `A-Z a-z 0-9 - _ . ~`, in uppercase. */
  private encode(value: string): string {
    return encodeURIComponent(value).replace(
      /[!'()*]/g,
      (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    );
  }

  private sha256Hex(text: string): string {
    return createHash('sha256').update(text, 'utf8').digest('hex');
  }

  private hmac(key: string | Buffer, text: string): Buffer {
    return createHmac('sha256', key).update(text, 'utf8').digest();
  }
}
