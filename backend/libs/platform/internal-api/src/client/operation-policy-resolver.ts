import { ExternalApiPolicy } from './external-api-policy.js';
import { PolicyName, type ResilienceRegistry } from '@platform/resilience';
import type { OperationMetadata } from '../contract/operation-metadata.js';

/** Elige la política de resiliencia con la que se llama una operación. */
export class OperationPolicyResolver {
  private readonly derived = new Map<string, PolicyName>();

  constructor(private readonly resilience: ResilienceRegistry) {}

  /**
   * Una operación sin `retry` ni `timeoutMs` propios usa `ExternalApiPolicy.NAME`.
   * Una con los suyos usa una política derivada de nombre
   * `external-api.t<timeoutMs>.a<maxAttempts>.b<baseMs>.m<maxMs>` (valores efectivos),
   * registrada la primera vez con `resilience.register` sobre `ExternalApiPolicy.CONFIG`
   * con ese `timeoutMs` y esa `RetryPolicy`. La configuración registrada se
   * guarda por nombre en la instancia: el registro compara por referencia y
   * no admite registrar dos veces el mismo nombre con objetos distintos.
   */
  resolve(metadata: OperationMetadata): PolicyName {
    if (metadata.retry === undefined && metadata.timeoutMs === undefined) {
      return ExternalApiPolicy.NAME;
    }
    const timeoutMs = metadata.attemptTimeoutMs();
    const retry = metadata.retryPolicy();
    const value = `${ExternalApiPolicy.NAME.value}.t${timeoutMs}.a${retry.maxAttempts}.b${retry.baseMs}.m${retry.maxMs}`;
    const known = this.derived.get(value);
    if (known !== undefined) {
      return known;
    }
    const name = PolicyName.of(value);
    this.resilience.register(name, {
      ...ExternalApiPolicy.CONFIG,
      timeoutMs,
      retry: { policy: retry },
    });
    this.derived.set(value, name);
    return name;
  }
}
