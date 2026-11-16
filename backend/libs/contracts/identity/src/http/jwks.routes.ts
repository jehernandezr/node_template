import {
  Access,
  defineRoute,
  HttpMethod,
  PlatformErrorCode,
} from '@contracts/platform';
import { IdentityRoute } from '../enums/identifiers.enum.js';
import { JwksSchema } from '../schemas/jwks.schema.js';

/** `GET /v1/auth/jwks`: claves públicas para verificar access tokens sin llamar a identity. */
export const GetJwksRoute = defineRoute({
  id: IdentityRoute.GetJwks,
  method: HttpMethod.Get,
  path: '/v1/auth/jwks',
  response: JwksSchema,
  errors: [PlatformErrorCode.RateLimitExceeded],
  access: Access.public(),
  description:
    'Devuelve las claves públicas vigentes en formato JWKS para verificar access tokens.',
});
