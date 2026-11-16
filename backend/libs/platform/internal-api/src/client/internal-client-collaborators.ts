import type { Clock } from '@platform/kernel';
import type { TraceContextRestorer } from '@platform/observability';
import type { ResilienceRegistry } from '@platform/resilience';
import type { ContractRegistry } from '../contract/contract-registry.js';
import type { OperationResolver } from '../contract/operation-resolver.js';
import type { PayloadLimit } from '../contract/payload-limit.js';
import type { Transport } from '../transport/transport.js';
import type { CallErrorTranslator } from './call-error-translator.js';
import type { ClientOutcomeChecker } from './client-outcome-checker.js';
import type { OperationPolicyResolver } from './operation-policy-resolver.js';

/** Colaboradores del `InternalClient`. */
export interface InternalClientCollaborators {
  readonly transport: Transport;
  readonly resilience: ResilienceRegistry;
  readonly resolver: OperationResolver;
  readonly policies: OperationPolicyResolver;
  readonly translator: CallErrorTranslator;
  readonly checker: ClientOutcomeChecker;
  readonly restorer: TraceContextRestorer;
  readonly clock: Clock;
  readonly payload: PayloadLimit;
  /**
   * Catálogo de las operaciones que este cliente puede llamar. Si se da, la
   * operación debe estar registrada; `callById` lo exige.
   */
  readonly registry?: ContractRegistry;
}
