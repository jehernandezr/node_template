import { randomUUID } from 'node:crypto';
import type { RouteRequest } from '@contracts/platform';
import { AuthMethod } from '../../../auth-method.enum.js';
import { RateLimitTier } from '../../../rate-limit-tier.enum.js';
import { Endpoint } from '../../endpoint.decorator.js';
import { Input } from '../../input.decorator.js';
import { Resource } from '../../resource.decorator.js';
import {
  ApiKeyItemsRoute,
  CreateItemRoute,
  GoneItemsRoute,
  ListItemsRoute,
  OldItemsRoute,
} from './demo-contract.js';
import { DemoResource } from './demo-resource.enum.js';

/** Rutas de elementos, con y sin deprecación. */
@Resource(DemoResource.Items)
export class ItemsController {
  @Endpoint(CreateItemRoute, { rateLimit: RateLimitTier.Standard })
  createItem(@Input() input: RouteRequest<typeof CreateItemRoute>) {
    return { id: randomUUID(), name: input.name };
  }

  @Endpoint(ListItemsRoute, { rateLimit: RateLimitTier.Standard })
  listItems(@Input() input: RouteRequest<typeof ListItemsRoute>) {
    return { limit: input.limit };
  }

  @Endpoint(OldItemsRoute, { rateLimit: RateLimitTier.Standard })
  oldItems() {
    return { ok: true as const };
  }

  @Endpoint(GoneItemsRoute, { rateLimit: RateLimitTier.Standard })
  goneItems() {
    return { ok: true as const };
  }

  @Endpoint(ApiKeyItemsRoute, { auth: [AuthMethod.Jwt, AuthMethod.ApiKey] })
  apiKeyItems() {
    return { ok: true as const };
  }
}
