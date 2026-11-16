import { OperationMetadata } from '../contract/operation-metadata.js';
import { InternalApiError } from '../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';

/**
 * URL base de cada servicio al que este proceso llama por HTTP. El servicio
 * dueño de una operación es el primer segmento de su id.
 */
export class ServiceBaseUrls {
  private readonly urls = new Map<string, string>();

  /**
   * @param urls URL base por nombre de servicio, por ejemplo `{ identity: 'http://identity:3000' }`.
   * @throws InternalApiError `InvalidConfiguration` si una URL no es `http` o `https` válida.
   */
  constructor(urls: Readonly<Record<string, string>>) {
    for (const [service, raw] of Object.entries(urls)) {
      this.urls.set(service, ServiceBaseUrls.normalize(service, raw));
    }
  }

  /**
   * URL base, sin barra final, del servicio dueño de `operationId`.
   * @throws InternalApiError `UnknownService` si no hay URL para ese servicio.
   */
  urlFor(operationId: string): string {
    const service = OperationMetadata.serviceOf(operationId);
    const url = this.urls.get(service);
    if (url === undefined) {
      throw new InternalApiError(
        InternalApiErrorCode.UnknownService,
        `No base URL is configured for service "${service}"`,
      );
    }
    return url;
  }

  private static normalize(service: string, raw: string): string {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new InternalApiError(
        InternalApiErrorCode.InvalidConfiguration,
        `The base URL of service "${service}" is not a valid URL`,
      );
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new InternalApiError(
        InternalApiErrorCode.InvalidConfiguration,
        `The base URL of service "${service}" must use http or https`,
      );
    }
    return raw.replace(/\/+$/, '');
  }
}
