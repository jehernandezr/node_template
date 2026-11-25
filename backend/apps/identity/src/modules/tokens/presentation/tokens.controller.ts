import { Endpoint, Exchange, Resource } from '@platform/http/nest';
import type { HttpExchange } from '@platform/http';
import { GetJwksRoute, type Jwks } from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { GetJwks } from '../application/get-jwks.use-case.js';

@Resource(IdentityResource.Tokens)
export class TokensController {
  /** The other services cache the JWKS for five minutes; a new key enters as a verification key before signing. */
  private static readonly CACHE_CONTROL = 'public, max-age=300';

  constructor(private readonly jwks: GetJwks) {}

  @Endpoint(GetJwksRoute)
  async getJwks(@Exchange() http: HttpExchange): Promise<Jwks> {
    const jwks = await this.jwks.execute();
    http.setHeader('Cache-Control', TokensController.CACHE_CONTROL);
    return jwks;
  }
}
