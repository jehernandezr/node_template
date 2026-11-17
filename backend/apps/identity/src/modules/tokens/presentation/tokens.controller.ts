import { Endpoint, Exchange, Resource } from '@platform/http/nest';
import type { HttpExchange } from '@platform/http';
import { GetJwksRoute, type Jwks } from '@contracts/identity';
import { IdentityResource } from '../../../shared/enums/identity-resource.enum.js';
import { GetJwks } from '../application/get-jwks.use-case.js';

@Resource(IdentityResource.Tokens)
export class TokensController {
  /** Los demás servicios guardan el JWKS cinco minutos; una clave nueva entra como de verificación antes de firmar. */
  private static readonly CACHE_CONTROL = 'public, max-age=300';

  constructor(private readonly jwks: GetJwks) {}

  @Endpoint(GetJwksRoute)
  async getJwks(@Exchange() http: HttpExchange): Promise<Jwks> {
    const jwks = await this.jwks.execute();
    http.setHeader('Cache-Control', TokensController.CACHE_CONTROL);
    return jwks;
  }
}
