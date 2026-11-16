import type { Actor } from '@platform/auth';
import { RequestContextStore } from '@platform/observability';
import { CurrentActor } from '../../current-actor.decorator.js';
import { Endpoint } from '../../endpoint.decorator.js';
import { RateLimitTier } from '../../../rate-limit-tier.enum.js';
import { Resource } from '../../resource.decorator.js';
import {
  DangerousRoute,
  GetMeRoute,
  ReadSecretRoute,
} from './demo-contract.js';
import { DemoResource } from './demo-resource.enum.js';

/** Rutas del usuario autenticado. */
@Resource(DemoResource.Me)
export class MeController {
  constructor(private readonly store: RequestContextStore) {}

  @Endpoint(GetMeRoute)
  getMe(@CurrentActor() actor: Actor | undefined) {
    const context = this.store.current();
    return {
      ...(actor !== undefined && 'userId' in actor && { userId: actor.userId }),
      tenantId: context?.tenantId,
    };
  }

  @Endpoint(ReadSecretRoute)
  readSecret() {
    return { ok: true as const };
  }

  @Endpoint(DangerousRoute, { rateLimit: RateLimitTier.Sensitive })
  dangerous() {
    return undefined;
  }
}
