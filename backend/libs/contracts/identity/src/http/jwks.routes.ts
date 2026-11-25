import {
  Access,
  defineRoute,
  HttpMethod,
  PlatformErrorCode,
} from '@contracts/platform';
import { IdentityRoute } from '../enums/identifiers.enum.js';
import { JwksSchema } from '../schemas/jwks.schema.js';

/** `GET /v1/auth/jwks`: public keys to verify access tokens without calling identity. */
export const GetJwksRoute = defineRoute({
  id: IdentityRoute.GetJwks,
  method: HttpMethod.Get,
  path: '/v1/auth/jwks',
  response: JwksSchema,
  errors: [PlatformErrorCode.RateLimitExceeded],
  access: Access.public(),
  description:
    'Returns the active public keys in JWKS format to verify access tokens.',
});
