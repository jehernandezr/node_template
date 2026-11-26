import type { UserRef } from '../../../../shared/types/user-ref.type.js';
import {
  MfaFactor,
  SignInStatus,
  type AuthMethodReference,
  type PendingMfa,
  type SignInResponse,
  type StepUpResult,
} from '@contracts/identity';
import type { PendingPurpose } from '../../../../shared/enums/pending-purpose.enum.js';
import type { PendingAuthentication } from '../../../../shared/types/pending-authentication.type.js';
import { MfaFacade } from '../../application/mfa.facade.js';
import type { StartPendingInput } from '../../domain/start-pending-input.js';

/** Pending authentications in memory. The `mfaToken`s are `mfa-1`, `mfa-2`, ... */
export class InMemoryMfaFacade extends MfaFacade {
  /** Methods offered in each challenge. */
  methods: MfaFactor[] = [MfaFactor.EmailOtp];
  readonly started: StartPendingInput[] = [];
  readonly denied: string[] = [];
  private counter = 0;

  override async startPending(input: StartPendingInput): Promise<PendingMfa> {
    this.started.push(input);
    this.counter += 1;
    return { mfaToken: `mfa-${this.counter}`, methods: [...this.methods] };
  }

  override async denyChallenge(challengeId: string): Promise<void> {
    this.denied.push(challengeId);
  }

  /** Pending authentications by `mfaToken` that `pending` returns. */
  readonly pendings = new Map<string, PendingAuthentication>();
  readonly completed: Array<{
    mfaToken: string;
    methods: readonly AuthMethodReference[];
  }> = [];

  override async pending(
    mfaToken: string,
    purpose: PendingPurpose,
  ): Promise<PendingAuthentication | undefined> {
    const found = this.pendings.get(mfaToken);
    return found?.purpose === purpose ? found : undefined;
  }

  override async completeSignIn(
    mfaToken: string,
    methods: readonly AuthMethodReference[],
  ): Promise<SignInResponse> {
    this.completed.push({ mfaToken, methods });
    return { status: SignInStatus.Authenticated };
  }

  override async completeStepUp(
    mfaToken: string,
    method: AuthMethodReference,
  ): Promise<StepUpResult> {
    this.completed.push({ mfaToken, methods: [method] });
    return {
      tokens: {
        accessToken: `access-${mfaToken}`,
        accessExpiresAt: new Date(0).toISOString(),
      },
      mfaVerifiedAt: new Date(0).toISOString(),
    };
  }

  readonly forgotten: UserRef[] = [];

  override async forget(ref: UserRef): Promise<void> {
    this.forgotten.push(ref);
  }
}
