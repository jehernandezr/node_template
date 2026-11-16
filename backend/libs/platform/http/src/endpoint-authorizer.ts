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

/** Aplica el requisito de acceso de la ruta al actor, con el grant que corresponde a su tipo. */
export class EndpointAuthorizer {
  constructor(
    private readonly resolver: AccessResolver,
    private readonly evaluator: AccessEvaluator,
    private readonly clock: Clock,
  ) {}

  /** @throws HttpProblemError (`PLATFORM.AUTH.FORBIDDEN` o `IDENTITY.MFA.STEP_UP_REQUIRED`). */
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
    if (decision.outcome === AccessOutcome.Forbidden) {
      throw HttpProblemError.forbidden(decision.missing);
    }
    if (decision.outcome === AccessOutcome.StepUpRequired) {
      throw HttpProblemError.stepUpRequired();
    }
  }

  /** Un usuario trae el grant de su tenant solo si la ruta pide permisos o roles. */
  private async grantFor(
    route: RouteDefinition,
    actor: Actor,
  ): Promise<AccessGrant> {
    if (ActorGuards.isUser(actor)) {
      const needsGrant =
        (route.access.permissions?.length ?? 0) > 0 ||
        (route.access.platformRoles?.length ?? 0) > 0;
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
