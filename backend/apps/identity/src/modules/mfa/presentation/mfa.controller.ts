import {
  CurrentActor,
  Endpoint,
  Exchange,
  Input,
  Resource,
} from '@platform/http/nest';
import { SessionCookieMode, type HttpExchange } from '@platform/http';
import type { Actor } from '@platform/auth';
import {
  RequestMfaChallengeRoute,
  VerifyMfaRoute,
  StartStepUpRoute,
  RequestStepUpChallengeRoute,
  VerifyStepUpRoute,
  StartTotpEnrollmentRoute,
  ConfirmTotpEnrollmentRoute,
  RemoveTotpRoute,
  RegenerateRecoveryCodesRoute,
  StartMfaRecoveryRoute,
  ConfirmMfaRecoveryRoute,
  type MfaChallenge,
  type MfaChallengeRequest,
  type MfaRecoveryConfirmRequest,
  type MfaRecoveryStartRequest,
  type MfaRecoveryStarted,
  type MfaVerifyRequest,
  type PendingMfa,
  type RecoveryCodes,
  type SignInResponse,
  type StepUpResult,
  type StepUpVerifyRequest,
  type TotpConfirmRequest,
  type TotpEnrollment,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { PendingPurpose } from '../../../shared/enums/pending-purpose.enum.js';
import { SessionDelivery } from '../../../shared/utils/session-delivery.js';
import {
  requireUserActor,
  userRefOf,
} from '../../../shared/utils/user-actor.js';
import { ManageMfaFactors } from '../application/manage-mfa-factors.use-case.js';
import { MfaRecoveryUseCase } from '../application/mfa-recovery.use-case.js';
import { RequestMfaChallenge } from '../application/request-mfa-challenge.use-case.js';
import { StepUp } from '../application/step-up.use-case.js';
import { VerifyMfa } from '../application/verify-mfa.use-case.js';

@Resource(IdentityResource.Mfa)
export class MfaController {
  constructor(
    private readonly challenge: RequestMfaChallenge,
    private readonly verify: VerifyMfa,
    private readonly stepUp: StepUp,
    private readonly factors: ManageMfaFactors,
    private readonly recovery: MfaRecoveryUseCase,
    private readonly delivery: SessionDelivery,
  ) {}

  @Endpoint(RequestMfaChallengeRoute)
  requestMfaChallenge(
    @Input() input: MfaChallengeRequest,
  ): Promise<MfaChallenge> {
    return this.challenge.execute(input, PendingPurpose.SignIn);
  }

  @Endpoint(VerifyMfaRoute, { sessionCookie: SessionCookieMode.Issue })
  async verifyMfa(
    @Input() input: MfaVerifyRequest,
    @Exchange() http: HttpExchange,
  ): Promise<SignInResponse> {
    return this.delivery.deliver(await this.verify.execute(input), http);
  }

  @Endpoint(StartStepUpRoute)
  startStepUp(
    @CurrentActor() actor: Actor | undefined,
    @Exchange() http: HttpExchange,
  ): Promise<PendingMfa> {
    return this.stepUp.begin(requireUserActor(actor), http.client);
  }

  @Endpoint(RequestStepUpChallengeRoute)
  requestStepUpChallenge(
    @Input() input: MfaChallengeRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<MfaChallenge> {
    requireUserActor(actor);
    return this.challenge.execute(input, PendingPurpose.StepUp);
  }

  @Endpoint(VerifyStepUpRoute)
  verifyStepUp(
    @Input() input: StepUpVerifyRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<StepUpResult> {
    return this.stepUp.verify(requireUserActor(actor), input);
  }

  @Endpoint(StartTotpEnrollmentRoute)
  startTotpEnrollment(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<TotpEnrollment> {
    return this.factors.startTotp(userRefOf(requireUserActor(actor)));
  }

  @Endpoint(ConfirmTotpEnrollmentRoute)
  confirmTotpEnrollment(
    @Input() input: TotpConfirmRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<RecoveryCodes> {
    return this.factors.confirmTotp(
      userRefOf(requireUserActor(actor)),
      input.code,
    );
  }

  @Endpoint(RemoveTotpRoute)
  async removeTotp(@CurrentActor() actor: Actor | undefined): Promise<void> {
    await this.factors.removeTotp(userRefOf(requireUserActor(actor)));
  }

  @Endpoint(RegenerateRecoveryCodesRoute)
  regenerateRecoveryCodes(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<RecoveryCodes> {
    return this.factors.regenerateRecoveryCodes(
      userRefOf(requireUserActor(actor)),
    );
  }

  @Endpoint(StartMfaRecoveryRoute)
  startMfaRecovery(
    @Input() input: MfaRecoveryStartRequest,
  ): Promise<MfaRecoveryStarted> {
    return this.recovery.start(input.mfaToken);
  }

  @Endpoint(ConfirmMfaRecoveryRoute, { sessionCookie: SessionCookieMode.Issue })
  async confirmMfaRecovery(
    @Input() input: MfaRecoveryConfirmRequest,
    @Exchange() http: HttpExchange,
  ): Promise<SignInResponse> {
    return this.delivery.deliver(await this.recovery.confirm(input), http);
  }
}
