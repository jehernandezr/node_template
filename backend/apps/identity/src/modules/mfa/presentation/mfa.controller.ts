import { ActingUser } from '@platform/auth';
import {
  CurrentActor,
  Endpoint,
  Exchange,
  Input,
  Resource,
} from '@platform/http/nest';
import {
  SessionCookieMode,
  type HttpExchange,
  RateLimitTier,
} from '@platform/http';
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
import { SessionDelivery } from '../../../sign-in/session-delivery.js';
import { ManageMfaFactors } from '../application/manage-mfa-factors.use-case.js';
import { MfaRecoveryUseCase } from '../application/mfa-recovery.use-case.js';
import { RequestMfaChallenge } from '../application/request-mfa-challenge.use-case.js';
import { StepUp } from '../application/step-up.use-case.js';
import { VerifyMfa } from '../application/verify-mfa.use-case.js';

/** HTTP edge of the second factor: challenges, step-up, TOTP, recovery codes and recovery without a device. */
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

  /**
   * Opens a challenge for a pending sign-in.
   * @param input Pending token and chosen method.
   * @returns The challenge.
   */
  @Endpoint(RequestMfaChallengeRoute)
  requestMfaChallenge(
    @Input() input: MfaChallengeRequest,
  ): Promise<MfaChallenge> {
    return this.challenge.execute(input, PendingPurpose.SignIn);
  }

  /**
   * Verifies the second factor of a pending sign-in and delivers the session token.
   * @param input Pending token, challenge and code.
   * @param http Exchange of the request.
   * @returns The sign-in result.
   */
  @Endpoint(VerifyMfaRoute, { sessionCookie: SessionCookieMode.Issue })
  async verifyMfa(
    @Input() input: MfaVerifyRequest,
    @Exchange() http: HttpExchange,
  ): Promise<SignInResponse> {
    return this.delivery.deliver(await this.verify.execute(input), http);
  }

  /**
   * Starts a step-up of the caller's session.
   * @param actor Caller.
   * @param http Exchange of the request.
   * @returns The pending step-up and its methods.
   */
  @Endpoint(StartStepUpRoute, { rateLimit: RateLimitTier.Sensitive })
  startStepUp(
    @CurrentActor() actor: Actor | undefined,
    @Exchange() http: HttpExchange,
  ): Promise<PendingMfa> {
    return this.stepUp.begin(ActingUser.of(actor), http.client);
  }

  /**
   * Opens a challenge for a step-up.
   * @param input Pending token and chosen method.
   * @param actor Caller.
   * @returns The challenge.
   */
  @Endpoint(RequestStepUpChallengeRoute, { rateLimit: RateLimitTier.Sensitive })
  requestStepUpChallenge(
    @Input() input: MfaChallengeRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<MfaChallenge> {
    ActingUser.of(actor);
    return this.challenge.execute(input, PendingPurpose.StepUp);
  }

  /**
   * Verifies the code of a step-up.
   * @param input Pending token, challenge and code.
   * @param actor Caller.
   * @returns The new access token and the last MFA.
   */
  @Endpoint(VerifyStepUpRoute, { rateLimit: RateLimitTier.Sensitive })
  verifyStepUp(
    @Input() input: StepUpVerifyRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<StepUpResult> {
    return this.stepUp.verify(ActingUser.of(actor), input);
  }

  /**
   * Starts the TOTP enrollment of the caller.
   * @param actor Caller.
   * @returns The secret and its URI.
   */
  @Endpoint(StartTotpEnrollmentRoute)
  startTotpEnrollment(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<TotpEnrollment> {
    return this.factors.startTotp(ActingUser.refOf(ActingUser.of(actor)));
  }

  /**
   * Confirms the TOTP enrollment with a first code.
   * @param input Code of the authenticator app.
   * @param actor Caller.
   * @returns The new recovery codes.
   */
  @Endpoint(ConfirmTotpEnrollmentRoute)
  confirmTotpEnrollment(
    @Input() input: TotpConfirmRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<RecoveryCodes> {
    return this.factors.confirmTotp(
      ActingUser.refOf(ActingUser.of(actor)),
      input.code,
    );
  }

  /**
   * Removes the TOTP factor of the caller.
   * @param actor Caller.
   */
  @Endpoint(RemoveTotpRoute)
  async removeTotp(@CurrentActor() actor: Actor | undefined): Promise<void> {
    await this.factors.removeTotp(ActingUser.refOf(ActingUser.of(actor)));
  }

  /**
   * Replaces the recovery codes of the caller.
   * @param actor Caller.
   * @returns The new recovery codes.
   */
  @Endpoint(RegenerateRecoveryCodesRoute)
  regenerateRecoveryCodes(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<RecoveryCodes> {
    return this.factors.regenerateRecoveryCodes(
      ActingUser.refOf(ActingUser.of(actor)),
    );
  }

  /**
   * Starts a recovery without a device for a pending sign-in.
   * @param input Pending token.
   * @returns When the recovery can be confirmed.
   */
  @Endpoint(StartMfaRecoveryRoute)
  startMfaRecovery(
    @Input() input: MfaRecoveryStartRequest,
  ): Promise<MfaRecoveryStarted> {
    return this.recovery.start(input.mfaToken);
  }

  /**
   * Confirms a recovery without a device and delivers the session token.
   * @param input Pending token, emailed token and an optional device key.
   * @param http Exchange of the request.
   * @returns The sign-in result.
   */
  @Endpoint(ConfirmMfaRecoveryRoute, { sessionCookie: SessionCookieMode.Issue })
  async confirmMfaRecovery(
    @Input() input: MfaRecoveryConfirmRequest,
    @Exchange() http: HttpExchange,
  ): Promise<SignInResponse> {
    return this.delivery.deliver(await this.recovery.confirm(input), http);
  }
}
