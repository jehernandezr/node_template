import { Endpoint, Exchange, Input, Resource } from '@platform/http/nest';
import { SessionCookieMode, type HttpExchange } from '@platform/http';
import {
  SignInRoute,
  type SignInRequest,
  type SignInResponse,
} from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { SessionDelivery } from '../../../sign-in/session-delivery.js';
import { SignInWithPassword } from '../application/sign-in-with-password.use-case.js';

/** HTTP route of password sign-in. */
@Resource(IdentityResource.Authentication)
export class AuthenticationController {
  constructor(
    private readonly signInWithPassword: SignInWithPassword,
    private readonly delivery: SessionDelivery,
  ) {}

  /**
   * Signs in with email and password and sets the session on the channel the client uses.
   * @param input Email, password and device proof.
   * @param http Request and response of the exchange.
   * @returns The session, or the pending second factor.
   */
  @Endpoint(SignInRoute, { sessionCookie: SessionCookieMode.Issue })
  async signIn(
    @Input() input: SignInRequest,
    @Exchange() http: HttpExchange,
  ): Promise<SignInResponse> {
    return this.delivery.deliver(
      await this.signInWithPassword.execute({
        request: input,
        client: http.client,
      }),
      http,
    );
  }
}
