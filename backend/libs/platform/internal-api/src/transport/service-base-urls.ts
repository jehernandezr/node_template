import { OperationMetadata } from '../contract/operation-metadata.js';
import { InternalApiError } from '../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../errors/internal-api-error-code.enum.js';

/**
 * Base URL of each service this process calls over HTTP. The service
 * that owns an operation is the first segment of its id.
 */
export class ServiceBaseUrls {
  private readonly urls = new Map<string, string>();

  /**
   * @param urls Base URL per service name, for example `{ identity: 'http://identity:3000' }`.
   * @throws InternalApiError `InvalidConfiguration` if a URL is not a valid `http` or `https` one.
   */
  constructor(urls: Readonly<Record<string, string>>) {
    for (const [service, raw] of Object.entries(urls)) {
      this.urls.set(service, ServiceBaseUrls.normalize(service, raw));
    }
  }

  /**
   * Returns the base URL, without a trailing slash, of the service that owns `operationId`.
   * @throws InternalApiError `UnknownService` if there is no URL for that service.
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
