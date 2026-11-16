import { createHash, createHmac } from 'node:crypto';
import type { Clock } from '@platform/kernel';
import type { AwsCredentials } from './aws-credentials.js';
import type { AwsCredentialsProvider } from './aws-credentials-provider.js';

/**
 * Identidad que firma el token. `ValkeyModule` la arma con sus propias
 * variables (`VALKEY_USER`, `VALKEY_CACHE_NAME`, `VALKEY_AUTH`) y la pasa en
 * cada llamada, así esos datos no se declaran dos veces.
 */
export interface ElastiCacheIamAuthRequest {
  /** Usuario de ElastiCache. Con autenticación IAM su id y su nombre coinciden. */
  readonly userId: string;
  /**
   * Nombre de la caché serverless o del grupo de replicación. Es el host de la
   * petición firmada, no el endpoint de conexión.
   */
  readonly cacheName: string;
  /** La caché es serverless: el token lo declara con `ResourceType`. */
  readonly serverless: boolean;
}

/**
 * Proveedor del token IAM con el que un usuario de ElastiCache se autentica
 * (`AUTH <usuario> <token>`). El token es una petición `connect` prefirmada con
 * SigV4 y sirve 15 minutos: el cliente de Valkey pide uno nuevo en cada
 * conexión y reconexión, así nunca presenta uno vencido. Cumple por forma el
 * puerto `ValkeyAuthTokenProvider`, sin que `aws` dependa de `valkey`.
 */
export class ElastiCacheIamAuthTokenProvider {
  /** Vigencia del token IAM de ElastiCache: 15 minutos. */
  static readonly TOKEN_TTL_SECONDS = 900;

  private static readonly ALGORITHM = 'AWS4-HMAC-SHA256';
  private static readonly SERVICE = 'elasticache';
  /** SHA-256 del cuerpo vacío: la petición firmada es un GET sin cuerpo. */
  private static readonly EMPTY_PAYLOAD_SHA256 =
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  /** @param region Región de la caché, la de `AWS_REGION`. */
  constructor(
    private readonly region: string,
    private readonly credentials: AwsCredentialsProvider,
    private readonly clock: Clock,
  ) {}

  /** Token vigente para esa identidad, firmado con las credenciales de este instante. */
  async token(request: ElastiCacheIamAuthRequest): Promise<string> {
    return this.sign(
      request,
      await this.credentials.resolve(),
      this.clock.now(),
    );
  }

  /**
   * Firma el token para un instante dado. Es la prefirma SigV4 de
   * `GET http://<cacheName>/?Action=connect&User=<userId>` sin el esquema.
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

  /** Codificación de SigV4: todo menos `A-Z a-z 0-9 - _ . ~`, en mayúsculas. */
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
