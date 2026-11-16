import { PolicyName, type ResiliencePolicyConfig } from '@platform/resilience';
import { OperationMetadata } from '../contract/operation-metadata.js';

/**
 * Política de resiliencia de las llamadas salientes entre servicios. El
 * `InternalApiModule` la registra con `ResilienceModule.forFeature`. El breaker
 * es por servicio destino: el `InternalClient` usa como `dependencyKey` el
 * primer segmento del id de la operación.
 */
export class ExternalApiPolicy {
  static readonly NAME = PolicyName.of('external-api');

  /**
   * Tiempo del intento y reintentos de una operación que no declara los suyos.
   * Salen de `OperationMetadata` para que el presupuesto por defecto de la
   * llamada (`callBudgetMs`) y lo que de verdad hace la política no diverjan.
   */
  static readonly CONFIG: ResiliencePolicyConfig = {
    timeoutMs: OperationMetadata.DEFAULT_TIMEOUT_MS,
    retry: { policy: OperationMetadata.DEFAULT_RETRY_POLICY },
    circuitBreaker: { consecutiveFailures: 5, halfOpenAfterMs: 30_000 },
  };
}
