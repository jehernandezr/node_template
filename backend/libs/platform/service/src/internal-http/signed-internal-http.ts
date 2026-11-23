import { InternalRequestSignerSelector } from '@platform/adapters-aws';
import type { AppConfig } from '@platform/config';
import { InternalApiSignerKind } from '@platform/internal-api';
import { SystemClock } from '@platform/kernel';
import type {
  ServiceInternalHttpContext,
  ServiceInternalHttpSettings,
} from '../service-internal-api.js';
import type { InternalHttpConfig } from './internal-http.config.js';

/**
 * Transporte HTTP de la API interna de un servicio. El secreto HMAC autentica siempre las llamadas que
 * entran; las que salen se firman con el firmador de `INTERNAL_API_SIGNER`: HMAC en local y SigV4 con el
 * rol del servicio cuando el destino valida con IAM.
 */
export class SignedInternalHttp {
  private readonly selector = new InternalRequestSignerSelector();

  /** @param callees servicios a los que este llama; cada uno necesita su URL en `INTERNAL_API_BASE_URLS`. */
  constructor(private readonly callees: readonly string[] = []) {}

  /**
   * @throws Error si falta la URL de un servicio de `callees`, para que el servicio no arranque sin poder
   *   llamarlo, o con SigV4 sin el adaptador de AWS: no hay credenciales con qué firmar.
   */
  settings(
    config: AppConfig,
    context: ServiceInternalHttpContext,
  ): ServiceInternalHttpSettings {
    const values = config.root<InternalHttpConfig>();
    const hmacSecret = values.INTERNAL_API_SHARED_SECRET.reveal();
    const baseUrls = values.INTERNAL_API_BASE_URLS;
    const missing = this.callees.filter((callee) => !(callee in baseUrls));
    if (missing.length > 0) {
      throw new Error(
        `INTERNAL_API_BASE_URLS no tiene la URL de ${missing.join(', ')}`,
      );
    }
    if (values.INTERNAL_API_SIGNER === InternalApiSignerKind.Hmac) {
      return { baseUrls, secret: hmacSecret };
    }
    if (context.aws === undefined) {
      throw new Error(
        'INTERNAL_API_SIGNER=sigv4 necesita el adaptador de AWS para firmar con el rol del servicio',
      );
    }
    return {
      baseUrls,
      secret: hmacSecret,
      signer: this.selector.select(values.INTERNAL_API_SIGNER, {
        hmacSecret,
        clock: new SystemClock(),
        credentials: context.aws.credentials,
        sigv4: {
          region: context.aws.region,
          service: values.INTERNAL_API_SIGV4_SERVICE,
        },
      }),
    };
  }
}
