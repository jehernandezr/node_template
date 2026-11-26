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

@Resource(IdentityResource.Authentication)
export class AuthenticationController {
  constructor(
    private readonly signInWithPassword: SignInWithPassword,
    private readonly delivery: SessionDelivery,
  ) {}

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
