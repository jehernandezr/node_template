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
  PasskeySignInOptionsRoute,
  PasskeySignInVerifyRoute,
  PasskeyMfaOptionsRoute,
  PasskeyMfaVerifyRoute,
  PasskeyStepUpOptionsRoute,
  PasskeyStepUpVerifyRoute,
  ListPasskeysRoute,
  PasskeyRegistrationOptionsRoute,
  RegisterPasskeyRoute,
  RemovePasskeyRoute,
  type PasskeyMfaOptionsRequest,
  type PasskeyMfaVerifyRequest,
  type PasskeyOptions,
  type PasskeyPage,
  type PasskeySignInVerifyRequest,
  type PasskeyStepUpOptionsRequest,
  type PasskeyStepUpVerifyRequest,
  type PasskeySummary,
  type RegisterPasskeyRequest,
  type RemovePasskeyRequest,
  type SignInResponse,
  type StepUpResult,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { SessionDelivery } from '../../../shared/utils/session-delivery.js';
import {
  requireUserActor,
  userRefOf,
} from '../../../shared/utils/user-actor.js';
import { ManagePasskeys } from '../application/manage-passkeys.use-case.js';
import { PasskeyAuthentication } from '../application/passkey-authentication.use-case.js';

@Resource(IdentityResource.Passkeys)
export class PasskeysController {
  constructor(
    private readonly authentication: PasskeyAuthentication,
    private readonly passkeys: ManagePasskeys,
    private readonly delivery: SessionDelivery,
  ) {}

  @Endpoint(PasskeySignInOptionsRoute)
  passkeySignInOptions(): Promise<PasskeyOptions> {
    return this.authentication.signInOptions();
  }

  @Endpoint(PasskeySignInVerifyRoute, {
    sessionCookie: SessionCookieMode.Issue,
  })
  async passkeySignInVerify(
    @Input() input: PasskeySignInVerifyRequest,
    @Exchange() http: HttpExchange,
  ): Promise<SignInResponse> {
    return this.delivery.deliver(
      await this.authentication.signIn(input, http.client),
      http,
    );
  }

  @Endpoint(PasskeyMfaOptionsRoute)
  passkeyMfaOptions(
    @Input() input: PasskeyMfaOptionsRequest,
  ): Promise<PasskeyOptions> {
    return this.authentication.mfaOptions(input.mfaToken);
  }

  @Endpoint(PasskeyMfaVerifyRoute, { sessionCookie: SessionCookieMode.Issue })
  async passkeyMfaVerify(
    @Input() input: PasskeyMfaVerifyRequest,
    @Exchange() http: HttpExchange,
  ): Promise<SignInResponse> {
    return this.delivery.deliver(
      await this.authentication.mfaVerify(input),
      http,
    );
  }

  @Endpoint(PasskeyStepUpOptionsRoute)
  passkeyStepUpOptions(
    @Input() input: PasskeyStepUpOptionsRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<PasskeyOptions> {
    requireUserActor(actor);
    return this.authentication.stepUpOptions(input.mfaToken);
  }

  @Endpoint(PasskeyStepUpVerifyRoute)
  passkeyStepUpVerify(
    @Input() input: PasskeyStepUpVerifyRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<StepUpResult> {
    requireUserActor(actor);
    return this.authentication.stepUpVerify(input);
  }

  @Endpoint(ListPasskeysRoute)
  listPasskeys(@CurrentActor() actor: Actor | undefined): Promise<PasskeyPage> {
    return this.passkeys.list(userRefOf(requireUserActor(actor)));
  }

  @Endpoint(PasskeyRegistrationOptionsRoute)
  passkeyRegistrationOptions(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<PasskeyOptions> {
    return this.passkeys.registrationOptions(
      userRefOf(requireUserActor(actor)),
    );
  }

  @Endpoint(RegisterPasskeyRoute)
  registerPasskey(
    @Input() input: RegisterPasskeyRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<PasskeySummary> {
    return this.passkeys.register(userRefOf(requireUserActor(actor)), input);
  }

  @Endpoint(RemovePasskeyRoute)
  async removePasskey(
    @Input() input: RemovePasskeyRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<void> {
    await this.passkeys.remove(
      userRefOf(requireUserActor(actor)),
      input.passkeyId,
    );
  }
}
