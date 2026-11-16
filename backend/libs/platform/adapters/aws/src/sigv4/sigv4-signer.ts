import {
  InternalApiError,
  InternalApiErrorCode,
  InternalRequestSigner,
  type SignableRequest,
} from '@platform/internal-api';
import type { Clock } from '@platform/kernel';
import { SignatureV4 } from '@smithy/signature-v4';
import type { AwsCredentialsProvider } from '../aws-credentials-provider.js';
import { NodeSha256 } from './node-sha256.js';
import type { SigV4SignerSettings } from './sigv4-signer-settings.js';

/**
 * Firma las llamadas internas con AWS Signature V4 y las credenciales del rol
 * del servicio. El destino las verifica con IAM, sin secreto compartido. Firma
 * el cuerpo como lo envía `HttpTransport` (`JSON.stringify`) y el host de
 * `baseUrl`, así que la firma solo vale para ese destino.
 */
export class SigV4Signer extends InternalRequestSigner {
  private static readonly HOST_HEADER = 'host';

  private readonly signer: SignatureV4;

  constructor(
    settings: SigV4SignerSettings,
    credentials: AwsCredentialsProvider,
    private readonly clock: Clock,
  ) {
    super();
    this.signer = new SignatureV4({
      service: settings.service,
      region: settings.region,
      sha256: NodeSha256,
      credentials: () => credentials.resolve(),
    });
  }

  /**
   * Devuelve `authorization`, `x-amz-date`, `x-amz-content-sha256` y, con
   * credenciales temporales, `x-amz-security-token`.
   * @throws InternalApiError `InvalidConfiguration` si la petición no trae `baseUrl`.
   */
  async sign(request: SignableRequest): Promise<Record<string, string>> {
    if (request.baseUrl === undefined) {
      throw new InternalApiError(
        InternalApiErrorCode.InvalidConfiguration,
        'SigV4 needs the base URL of the target service',
      );
    }
    const url = new URL(`${request.baseUrl}${request.path}`);
    const sent = SigV4Signer.definedHeaders(request.headers);
    const signed = await this.signer.sign(
      {
        method: request.method,
        protocol: url.protocol,
        hostname: url.hostname,
        ...(url.port === '' ? {} : { port: Number(url.port) }),
        path: url.pathname,
        query: {},
        headers: { ...sent, [SigV4Signer.HOST_HEADER]: url.host },
        body: JSON.stringify(request.body),
      },
      { signingDate: this.clock.now() },
    );
    return Object.fromEntries(
      Object.entries(signed.headers).filter(
        ([name]) => name !== SigV4Signer.HOST_HEADER && !(name in sent),
      ),
    );
  }

  private static definedHeaders(
    headers: SignableRequest['headers'],
  ): Record<string, string> {
    return Object.fromEntries(
      Object.entries(headers).filter(
        (entry): entry is [string, string] => entry[1] !== undefined,
      ),
    );
  }
}
