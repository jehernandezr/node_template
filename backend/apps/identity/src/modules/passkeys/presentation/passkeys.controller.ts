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

/** HTTP edge of passkeys: sign-in, second factor, step-up and the user's passkey list. */
@Resource(IdentityResource.Passkeys)
export class PasskeysController {
  constructor(
    private readonly authentication: PasskeyAuthentication,
    private readonly passkeys: ManagePasskeys,
    private readonly delivery: SessionDelivery,
  ) {}

  /**
   * Starts a passwordless sign-in.
   * @returns The WebAuthn options.
   */
  @Endpoint(PasskeySignInOptionsRoute)
  passkeySignInOptions(): Promise<PasskeyOptions> {
    return this.authentication.signInOptions();
  }

  /**
   * Signs in with a passkey and delivers the session token.
   * @param input Challenge, WebAuthn response and optional device proof.
   * @param http Exchange of the request.
   * @returns The sign-in result.
   */
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

  /**
   * Starts the passkey second factor of a pending sign-in.
   * @param input Token of the pending sign-in.
   * @returns The WebAuthn options.
   */
  @Endpoint(PasskeyMfaOptionsRoute)
  passkeyMfaOptions(
    @Input() input: PasskeyMfaOptionsRequest,
  ): Promise<PasskeyOptions> {
    return this.authentication.mfaOptions(input.mfaToken);
  }

  /**
   * Completes a pending sign-in with a passkey and delivers the session token.
   * @param input Pending token, challenge and WebAuthn response.
   * @param http Exchange of the request.
   * @returns The sign-in result.
   */
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

  /**
   * Starts the passkey step-up of the caller's session.
   * @param input Token of the pending step-up.
   * @param actor Caller.
   * @returns The WebAuthn options.
   */
  @Endpoint(PasskeyStepUpOptionsRoute)
  passkeyStepUpOptions(
    @Input() input: PasskeyStepUpOptionsRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<PasskeyOptions> {
    return this.authentication.stepUpOptions(
      input.mfaToken,
      requireUserActor(actor).sessionId,
    );
  }

  /**
   * Completes the passkey step-up of the caller's session.
   * @param input Pending token, challenge and WebAuthn response.
   * @param actor Caller.
   * @returns The new access token and the last MFA.
   */
  @Endpoint(PasskeyStepUpVerifyRoute)
  passkeyStepUpVerify(
    @Input() input: PasskeyStepUpVerifyRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<StepUpResult> {
    return this.authentication.stepUpVerify(
      input,
      requireUserActor(actor).sessionId,
    );
  }

  /**
   * Lists the caller's passkeys.
   * @param actor Caller.
   * @returns The passkeys.
   */
  @Endpoint(ListPasskeysRoute)
  listPasskeys(@CurrentActor() actor: Actor | undefined): Promise<PasskeyPage> {
    return this.passkeys.list(userRefOf(requireUserActor(actor)));
  }

  /**
   * Starts the registration of a passkey.
   * @param actor Caller.
   * @returns The WebAuthn creation options.
   */
  @Endpoint(PasskeyRegistrationOptionsRoute)
  passkeyRegistrationOptions(
    @CurrentActor() actor: Actor | undefined,
  ): Promise<PasskeyOptions> {
    return this.passkeys.registrationOptions(
      userRefOf(requireUserActor(actor)),
    );
  }

  /**
   * Registers a passkey for the caller.
   * @param input Challenge, authenticator response and name.
   * @param actor Caller.
   * @returns The registered passkey.
   */
  @Endpoint(RegisterPasskeyRoute)
  registerPasskey(
    @Input() input: RegisterPasskeyRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<PasskeySummary> {
    return this.passkeys.register(userRefOf(requireUserActor(actor)), input);
  }

  /**
   * Removes one of the caller's passkeys.
   * @param input Passkey to remove.
   * @param actor Caller.
   */
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
