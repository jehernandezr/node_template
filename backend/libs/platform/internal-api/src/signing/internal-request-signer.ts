import type { SignableRequest } from '../auth/signable-request.js';

/**
 * Puerto que firma una llamada saliente entre servicios. `HmacSigner` y el
 * `SigV4Signer` de `@platform/adapters-aws` lo cumplen; la prueba de contrato
 * `runInternalRequestSignerContract` fija lo que ambos deben garantizar.
 */
export abstract class InternalRequestSigner {
  /**
   * Cabeceras, con el nombre en minúscula, que se suman a la llamada para
   * autenticarla. No repite las de `request.headers`.
   */
  abstract sign(request: SignableRequest): Promise<Record<string, string>>;
}
