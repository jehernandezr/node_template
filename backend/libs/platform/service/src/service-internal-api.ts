import type { AppConfig } from '@platform/config';
import type { InternalRequestSigner } from '@platform/internal-api';

/** Cómo llega una llamada interna al dueño de la operación. */
export enum ServiceInternalTransport {
  /** Directo al router del mismo proceso: el modo local y el de las pruebas. */
  InProcess = 'in-process',
  /** Por HTTP firmado hacia otro proceso. */
  Http = 'http',
}

/** Datos del transporte HTTP de la API interna; salen de la configuración validada. */
export interface ServiceInternalHttpSettings {
  /** URL base por nombre de servicio. */
  readonly baseUrls: Readonly<Record<string, string>>;
  /** Secreto HMAC compartido entre servicios. */
  readonly secret: string;
  /** Firmador de salida; sin valor, HMAC con `secret`. Lo arma el servicio según `INTERNAL_API_SIGNER`. */
  readonly signer?: InternalRequestSigner;
  readonly signatureWindowMs?: number;
}

/** Cómo declara el servicio su API interna. */
export interface ServiceInternalApi {
  readonly transport: ServiceInternalTransport;
  /** Obligatorio con `ServiceInternalTransport.Http`; también autentica las llamadas entrantes. */
  readonly http?: (config: AppConfig) => ServiceInternalHttpSettings;
}
