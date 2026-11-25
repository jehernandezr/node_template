import type { SigV4Service } from './sigv4-service.enum.js';

/** AWS region and service the internal calls are signed for. */
export interface SigV4SignerSettings {
  /** Region of the destination, the one in `AWS_REGION`. */
  readonly region: string;
  readonly service: SigV4Service;
}
