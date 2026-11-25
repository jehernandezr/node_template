import { AccessKind, type RouteDefinition } from '@contracts/platform';
import {
  AccessEvaluator,
  AccessOutcome,
  AccessResolver,
  ActorGuards,
  type AccessGrant,
  type Actor,
} from '@platform/auth';
import type { Clock } from '@platform/kernel';
import { HttpProblemError } from './http-problem.error.js';

/** Applies the route's access requirement to the actor, with the grant matching its type. */
export class EndpointAuthorizer {
  constructor(
    private readonly resolver: AccessResolver,
    private readonly evaluator: AccessEvaluator,
    private readonly clock: Clock,
  ) {}

  /**
   * @throws HttpProblemError (`PLATFORM.AUTH.FORBIDDEN`, `PLATFORM.ACCESS.FEATURE_NOT_INCLUDED`,
   * `PLATFORM.ACCESS.FLAG_DISABLED` o `IDENTITY.MFA.STEP_UP_REQUIRED`).
   */
  async authorize(route: RouteDefinition, actor: Actor): Promise<void> {
    if (route.access.kind === AccessKind.Public) {
      return;
    }
    const grant = await this.grantFor(route, actor);
    const decision = this.evaluator.evaluate({
      requirement: route.access,
      actor,
      grant,
      now: this.clock.now(),
    });
    switch (decision.outcome) {
      case AccessOutcome.Allowed:
        return;
      case AccessOutcome.Forbidden:
        throw HttpProblemError.forbidden(decision.missing);
      case AccessOutcome.FeatureNotIncluded:
        throw HttpProblemError.featureNotIncluded(decision.missing);
      case AccessOutcome.FlagDisabled:
        throw HttpProblemError.flagDisabled();
      case AccessOutcome.StepUpRequired:
        throw HttpProblemError.stepUpRequired();
    }
  }

  /**
   * A user brings their tenant's grant only if the route requires permissions, roles, features or flags. A
   * service account has no grant of its own for plan or flags, so it does not satisfy routes that require them.
   */
  private async grantFor(
    route: RouteDefinition,
    actor: Actor,
  ): Promise<AccessGrant> {
    if (ActorGuards.isUser(actor)) {
      const { permissions, platformRoles, features, flags } = route.access;
      const needsGrant = [permissions, platformRoles, features, flags].some(
        (required) => (required?.length ?? 0) > 0,
      );
      if (!needsGrant) {
        return EndpointAuthorizer.emptyGrant(actor.permissionVersion);
      }
      return this.resolver.resolve(actor.tenantId, actor.userId);
    }
    if (ActorGuards.isServiceAccount(actor)) {
      return {
        permissions: actor.permissions,
        platformRoles: [],
        features: [],
        flags: [],
        permissionVersion: '0.0',
      };
    }
    return EndpointAuthorizer.emptyGrant('0.0');
  }

  private static emptyGrant(permissionVersion: string): AccessGrant {
    return {
      permissions: [],
      platformRoles: [],
      features: [],
      flags: [],
      permissionVersion,
    };
  }
}
