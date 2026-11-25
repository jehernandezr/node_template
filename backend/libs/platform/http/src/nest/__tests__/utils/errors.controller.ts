import { Endpoint } from '../../endpoint.decorator.js';
import { RateLimitTier } from '../../../rate-limit-tier.enum.js';
import { Resource } from '../../resource.decorator.js';
import { DemoConflictError } from './demo-conflict.error.js';
import {
  BadOutputRoute,
  BoomRoute,
  ConflictRoute,
  SlowRoute,
} from './demo-contract.js';
import { DemoResource } from './demo-resource.enum.js';

/** Routes that fail on purpose, to test the error filter and the time cap. */
@Resource(DemoResource.Errors)
export class ErrorsController {
  @Endpoint(BoomRoute, { rateLimit: RateLimitTier.Standard })
  boom(): never {
    throw new Error('internal detail that must not leave the server');
  }

  @Endpoint(BadOutputRoute, { rateLimit: RateLimitTier.Standard })
  badOutput() {
    return { ok: 'yes' };
  }

  @Endpoint(ConflictRoute, { rateLimit: RateLimitTier.Standard })
  conflict(): never {
    throw new DemoConflictError('item already exists');
  }

  @Endpoint(SlowRoute, { rateLimit: RateLimitTier.Standard, timeoutMs: 50 })
  async slow(): Promise<undefined> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return undefined;
  }
}
