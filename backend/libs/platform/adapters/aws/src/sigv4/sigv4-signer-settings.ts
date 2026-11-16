import type { SigV4Service } from './sigv4-service.enum.js';

/** A qué región y servicio de AWS se firman las llamadas internas. */
export interface SigV4SignerSettings {
  /** Región del destino, la de `AWS_REGION`. */
  readonly region: string;
  readonly service: SigV4Service;
}
