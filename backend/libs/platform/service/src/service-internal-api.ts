import type { AwsCredentialsProvider } from '@platform/adapters-aws';
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

/** Credenciales y región del rol del servicio, con las que se firma con SigV4. */
export interface ServiceAwsIdentity {
  readonly credentials: AwsCredentialsProvider;
  readonly region: string;
}

/** Lo que el runtime ofrece al servicio para armar su transporte HTTP. */
export interface ServiceInternalHttpContext {
  /** Solo con el adaptador de AWS activo. */
  readonly aws?: ServiceAwsIdentity;
}

/** Cómo declara el servicio su API interna. */
export interface ServiceInternalApi {
  readonly transport: ServiceInternalTransport;
  /**
   * Obligatorio con `ServiceInternalTransport.Http`; también autentica las llamadas entrantes. El servicio
   * elige aquí su firmador según `INTERNAL_API_SIGNER`.
   */
  readonly http?: (
    config: AppConfig,
    context: ServiceInternalHttpContext,
  ) => ServiceInternalHttpSettings;
}
