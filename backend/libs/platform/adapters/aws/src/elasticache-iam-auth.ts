import { createHash, createHmac } from 'node:crypto';
import { SystemClock, type Clock } from '@platform/kernel';
import type { AwsMessagingClients } from './aws-clients.js';

/** Credenciales de AWS con las que se firma. */
export interface AwsCredentials {
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  /** Presente con credenciales temporales (rol de Lambda o de la tarea). */
  readonly sessionToken?: string;
}

/** Entrega credenciales vigentes; se llama en cada firma. */
export type AwsCredentialsProvider = () => Promise<AwsCredentials>;

/**
 * Credenciales de la cadena por defecto del SDK (rol de la Lambda o de la
 * tarea de Fargate; en local, las variables de entorno). El cliente ya resuelve
 * y renueva esa cadena, así que se reutiliza en lugar de sumar otro paquete del
 * SDK solo para leer credenciales.
 */
export function credentialsOf(
  clients: AwsMessagingClients,
): AwsCredentialsProvider {
  return () => clients.sqs.config.credentials();
}

/** Vigencia del token IAM de ElastiCache: 15 minutos. */
export const ELASTICACHE_IAM_TOKEN_TTL_SECONDS = 900;

const ALGORITHM = 'AWS4-HMAC-SHA256';
const SERVICE = 'elasticache';
/** SHA-256 del cuerpo vacío: la petición firmada es un GET sin cuerpo. */
const EMPTY_PAYLOAD_SHA256 =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

/** Opciones de {@link elastiCacheIamAuthToken}. */
export interface ElastiCacheIamAuthOptions {
  readonly region: string;
  /**
   * Nombre de la caché serverless o del grupo de replicación. Es el host de la
   * petición firmada, no el endpoint de conexión.
   */
  readonly cacheName: string;
  /** Usuario de ElastiCache. Con autenticación IAM su id y su nombre coinciden. */
  readonly userId: string;
  /** La caché es serverless: el token lo declara con `ResourceType`. */
  readonly serverless: boolean;
  readonly credentials: AwsCredentialsProvider;
  readonly clock?: Clock;
}

/**
 * Proveedor del token IAM con el que un usuario de ElastiCache se autentica
 * (`AUTH <usuario> <token>`). El token es una petición `connect` prefirmada con
 * SigV4 y sirve 15 minutos: el cliente de Valkey pide uno nuevo en cada
 * conexión y reconexión, así nunca presenta uno vencido.
 */
export function elastiCacheIamAuthToken(
  options: ElastiCacheIamAuthOptions,
): () => Promise<string> {
  const clock = options.clock ?? new SystemClock();
  return async () =>
    signElastiCacheIamToken(await options.credentials(), options, clock.now());
}

/**
 * Firma el token para un instante dado. Es la prefirma SigV4 de
 * `GET http://<cacheName>/?Action=connect&User=<userId>` sin el esquema.
 */
export function signElastiCacheIamToken(
  credentials: AwsCredentials,
  options: Pick<
    ElastiCacheIamAuthOptions,
    'region' | 'cacheName' | 'userId' | 'serverless'
  >,
  now: Date,
): string {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = amzDate.slice(0, 8);
  const scope = `${date}/${options.region}/${SERVICE}/aws4_request`;

  const query: [string, string][] = [
    ['Action', 'connect'],
    ['User', options.userId],
    ['X-Amz-Algorithm', ALGORITHM],
    ['X-Amz-Credential', `${credentials.accessKeyId}/${scope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(ELASTICACHE_IAM_TOKEN_TTL_SECONDS)],
    ['X-Amz-SignedHeaders', 'host'],
  ];
  if (options.serverless) {
    query.push(['ResourceType', 'ServerlessCache']);
  }
  if (credentials.sessionToken !== undefined) {
    query.push(['X-Amz-Security-Token', credentials.sessionToken]);
  }
  const canonicalQuery = query
    .map(([key, value]) => [encodeRfc3986(key), encodeRfc3986(value)])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  const canonicalRequest = [
    'GET',
    '/',
    canonicalQuery,
    `host:${options.cacheName}\n`,
    'host',
    EMPTY_PAYLOAD_SHA256,
  ].join('\n');
  const stringToSign = [
    ALGORITHM,
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  let key = hmac(`AWS4${credentials.secretAccessKey}`, date);
  for (const part of [options.region, SERVICE, 'aws4_request']) {
    key = hmac(key, part);
  }
  const signature = hmac(key, stringToSign).toString('hex');

  return `${options.cacheName}/?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/** Codificación de SigV4: todo menos `A-Z a-z 0-9 - _ . ~`, en mayúsculas. */
function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function hmac(key: string | Buffer, text: string): Buffer {
  return createHmac('sha256', key).update(text, 'utf8').digest();
}
