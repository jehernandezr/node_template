import { randomBytes } from 'node:crypto';
import type { RouteRequest } from '@contracts/platform';
import { RateLimitTier } from '../../../rate-limit-tier.enum.js';
import { SessionCookieMode } from '../../../session-cookie-mode.enum.js';
import { Endpoint } from '../../endpoint.decorator.js';
import { Input } from '../../input.decorator.js';
import { Resource } from '../../resource.decorator.js';
import {
  ClearSessionRoute,
  IssueSessionRoute,
  LimitedRoute,
  RotateSessionRoute,
} from './demo-contract.js';
import { DemoResource } from './demo-resource.enum.js';

/** Rutas de sesión del canal web y nativo. */
@Resource(DemoResource.Auth)
export class SessionController {
  @Endpoint(IssueSessionRoute, {
    rateLimit: RateLimitTier.Standard,
    sessionCookie: SessionCookieMode.Issue,
  })
  issueSession() {
    return {
      sessionToken: `st1_${randomBytes(16).toString('hex')}`,
      accessToken: 'access-token',
    };
  }

  @Endpoint(RotateSessionRoute, {
    rateLimit: RateLimitTier.Standard,
    sessionCookie: SessionCookieMode.Rotate,
  })
  rotateSession(@Input() input: RouteRequest<typeof RotateSessionRoute>) {
    return {
      accessToken: 'access-token',
      ...(input.sessionToken !== undefined && {
        sessionToken: input.sessionToken,
      }),
    };
  }

  @Endpoint(ClearSessionRoute, {
    rateLimit: RateLimitTier.Standard,
    sessionCookie: SessionCookieMode.Clear,
  })
  clearSession() {
    return undefined;
  }

  @Endpoint(LimitedRoute)
  limited() {
    return undefined;
  }
}
