import { MfaFactor, type PendingMfa } from '@contracts/identity';
import { MfaFacade } from '../../application/mfa.facade.js';
import type { StartPendingInput } from '../../domain/start-pending-input.js';

/** Autenticaciones pendientes en memoria. Los `mfaToken` son `mfa-1`, `mfa-2`, ... */
export class InMemoryMfaFacade extends MfaFacade {
  /** Métodos que se ofrecen en cada desafío. */
  methods: MfaFactor[] = [MfaFactor.EmailOtp];
  readonly pending: StartPendingInput[] = [];
  private counter = 0;

  async startPending(input: StartPendingInput): Promise<PendingMfa> {
    this.pending.push(input);
    this.counter += 1;
    return { mfaToken: `mfa-${this.counter}`, methods: [...this.methods] };
  }
}
