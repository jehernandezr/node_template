import { Injectable } from '@nestjs/common';
import { CallOutcome } from '@platform/primitives';
import { InternalHandler } from '../../internal-handler.decorator.js';
import type { HandlerResult } from '../../../server/handler-result.js';
import type { CallMeta } from '../../../transport/call-meta.js';
import { E2eOperations } from './e2e-operations.js';

/** Handlers del servidor del flujo de extremo a extremo, con contadores públicos para verificarlo. */
@Injectable()
export class GreeterHandlers {
  greetCalls = 0;
  flakyCalls = 0;
  lastContext: CallMeta | undefined;

  @InternalHandler(E2eOperations.Greet)
  greet(
    input: { name: string },
    context: CallMeta,
  ): Promise<HandlerResult<{ greeting: string }>> {
    this.greetCalls += 1;
    this.lastContext = context;
    return Promise.resolve({
      outcome: CallOutcome.success({ greeting: `Hello ${input.name}` }),
    });
  }

  @InternalHandler(E2eOperations.Flaky)
  flaky(): Promise<HandlerResult<{ attempts: number }>> {
    this.flakyCalls += 1;
    if (this.flakyCalls === 1) {
      return Promise.resolve({ outcome: CallOutcome.transientFailure('busy') });
    }
    return Promise.resolve({
      outcome: CallOutcome.success({ attempts: this.flakyCalls }),
    });
  }
}
