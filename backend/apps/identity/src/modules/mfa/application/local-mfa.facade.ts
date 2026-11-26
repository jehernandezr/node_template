import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import type {
  AuthMethodReference,
  PendingMfa,
  SignInResponse,
  StepUpResult,
} from '@contracts/identity';
import type { PendingPurpose } from '../../../shared/enums/pending-purpose.enum.js';
import type { PendingAuthentication } from '../../../shared/types/pending-authentication.type.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { PendingAuthenticationStore } from '../domain/pending-authentication-store.js';
import { StepUp } from './step-up.use-case.js';
import { VerifyMfa } from './verify-mfa.use-case.js';
import { ChallengeStore } from '../domain/challenge-store.js';
import { MfaFactorRepository } from '../domain/mfa-factor-repository.js';
import type { StartPendingInput } from '../domain/start-pending-input.js';
import { MfaFacade } from './mfa.facade.js';
import { StartPendingMfa } from './start-pending-mfa.use-case.js';

/** `MfaFacade` inside the process. */
@Injectable()
export class LocalMfaFacade extends MfaFacade {
  constructor(
    private readonly start: StartPendingMfa,
    private readonly challenges: ChallengeStore,
    private readonly pendings: PendingAuthenticationStore,
    private readonly verify: VerifyMfa,
    private readonly stepUp: StepUp,
    private readonly factors: MfaFactorRepository,
    private readonly scopes: ShardScopes,
  ) {
    super();
  }

  /** {@inheritDoc MfaFacade.startPending} */
  override startPending(input: StartPendingInput): Promise<PendingMfa> {
    return this.start.execute(input);
  }

  /** {@inheritDoc MfaFacade.denyChallenge} */
  override async denyChallenge(challengeId: string): Promise<void> {
    await this.challenges.consume(challengeId);
  }

  /** {@inheritDoc MfaFacade.pending} */
  override async pending(
    mfaToken: string,
    purpose: PendingPurpose,
  ): Promise<PendingAuthentication | undefined> {
    const found = await this.pendings.find(mfaToken);
    return found?.purpose === purpose ? found : undefined;
  }

  /** {@inheritDoc MfaFacade.completeSignIn} */
  override completeSignIn(
    mfaToken: string,
    methods: readonly AuthMethodReference[],
    devicePublicKey?: string,
  ): Promise<SignInResponse> {
    return this.verify.complete(mfaToken, methods, devicePublicKey);
  }

  /** {@inheritDoc MfaFacade.completeStepUp} */
  override completeStepUp(
    mfaToken: string,
    method: AuthMethodReference,
  ): Promise<StepUpResult> {
    return this.stepUp.complete(mfaToken, method);
  }

  /** {@inheritDoc MfaFacade.forget} */
  override async forget(ref: UserRef): Promise<void> {
    await this.scopes.inUserShard(ref, () => this.factors.forget(ref.userId));
  }
}
