import { ResilienceRegistryFactory } from '@platform/resilience';
import { SystemClock, type Clock, SystemRandomSource } from '@platform/kernel';
import {
  Redactor,
  Tracing,
  TraceContextRestorer,
} from '@platform/observability';
import { CallOutcomeFactory, FailureClassifier } from '@platform/primitives';
import { ContractRegistry } from '../../../contract/contract-registry.js';
import { PayloadLimit } from '../../../contract/payload-limit.js';
import { OperationResolver } from '../../../contract/operation-resolver.js';
import { CallErrorTranslator } from '../../call-error-translator.js';
import { ClientOutcomeChecker } from '../../client-outcome-checker.js';
import { ExternalApiPolicy } from '../../external-api-policy.js';
import { InternalClient } from '../../internal-client.js';
import { OperationPolicyResolver } from '../../operation-policy-resolver.js';
import { ScriptedTransport } from './scripted-transport.js';

/**
 * Client with its real collaborators and a scripted transport. Each test
 * creates its own so the policy breaker does not carry over between cases.
 */
export class InternalClientHarness {
  readonly transport = new ScriptedTransport();
  readonly resilience = new ResilienceRegistryFactory().create(
    {},
    {
      clock: new SystemClock(),
      random: new SystemRandomSource(),
      classifier: new FailureClassifier(),
    },
  );
  readonly clock: Clock;
  readonly client: InternalClient;

  constructor(options: { clock?: Clock; registry?: ContractRegistry } = {}) {
    this.resilience.register(ExternalApiPolicy.NAME, ExternalApiPolicy.CONFIG);
    this.clock = options.clock ?? new SystemClock();
    this.client = new InternalClient({
      transport: this.transport,
      resilience: this.resilience,
      resolver: new OperationResolver(),
      policies: new OperationPolicyResolver(this.resilience),
      translator: new CallErrorTranslator(
        new CallOutcomeFactory(new FailureClassifier()),
      ),
      checker: new ClientOutcomeChecker(new PayloadLimit()),
      restorer: new TraceContextRestorer(new Tracing(new Redactor())),
      clock: this.clock,
      payload: new PayloadLimit(),
      ...(options.registry !== undefined && { registry: options.registry }),
    });
  }
}
