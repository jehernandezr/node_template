import { AccessKind, type AccessRequirement } from '@contracts/platform';
import { AuthMethodReference } from '@contracts/identity';
import type { Actor } from '../actor/actor.js';
import { ActorGuards } from '../actor/actor-guards.js';
import type { AccessDecision } from './access-decision.js';
import type { AccessEvaluation } from './access-evaluation.js';
import type { AccessGrant } from './access-grant.js';
import { AccessOutcome } from './access-outcome.enum.js';

/**
 * Applies the `AccessRequirement` of a route to an actor, without state and without I/O.
 *
 * - Public route: `Allowed`.
 * - `SystemActor`: `Forbidden` on any authenticated route.
 * - `flags`: the grant has all of them on; otherwise, `FlagDisabled`. It is evaluated first because a disabled flag
 *   makes the route not exist for the user, whether or not they have permissions.
 * - `permissions`: the grant has all of them (`missing` lists the missing ones).
 * - `platformRoles`: the grant has at least one. A `ServiceAccountActor` never satisfies it.
 * - `features`: the tenant plan includes all of them; otherwise, `FeatureNotIncluded` with the missing ones.
 * - `mfaMaxAgeMinutes`: the actor is a user whose `authMethods` includes some method other than `Password` and `now - authTime` fits in the window. A `ServiceAccountActor` never satisfies it and gets `Forbidden`.
 * - With several failures `Forbidden` wins over `FeatureNotIncluded` and that one over `StepUpRequired`.
 */
export class AccessEvaluator {
  evaluate(evaluation: AccessEvaluation): AccessDecision {
    const { requirement, actor, grant, now } = evaluation;
    if (requirement.kind === AccessKind.Public) {
      return { outcome: AccessOutcome.Allowed };
    }
    if (ActorGuards.isSystem(actor)) {
      return {
        outcome: AccessOutcome.Forbidden,
        missing: [
          ...(requirement.permissions ?? []),
          ...(requirement.platformRoles ?? []),
        ],
      };
    }
    if (AccessEvaluator.lacking(requirement.flags, grant.flags).length > 0) {
      return { outcome: AccessOutcome.FlagDisabled };
    }

    const missing = [
      ...AccessEvaluator.lacking(requirement.permissions, grant.permissions),
      ...AccessEvaluator.missingRoles(requirement, actor, grant),
    ];
    if (missing.length > 0) {
      return { outcome: AccessOutcome.Forbidden, missing };
    }

    const missingFeatures = AccessEvaluator.lacking(
      requirement.features,
      grant.features,
    );
    if (missingFeatures.length > 0) {
      return {
        outcome: AccessOutcome.FeatureNotIncluded,
        missing: missingFeatures,
      };
    }

    return AccessEvaluator.secondFactor(requirement, actor, now);
  }

  private static lacking(
    required: readonly string[] | undefined,
    owned: readonly string[],
  ): string[] {
    const available = new Set<string>(owned);
    return (required ?? []).filter((value) => !available.has(value));
  }

  private static missingRoles(
    requirement: AccessRequirement,
    actor: Actor,
    grant: AccessGrant,
  ): readonly string[] {
    const requiredRoles = requirement.platformRoles ?? [];
    if (requiredRoles.length === 0) {
      return [];
    }
    const ownedRoles = new Set<string>(grant.platformRoles);
    const satisfied =
      ActorGuards.isUser(actor) &&
      requiredRoles.some((role) => ownedRoles.has(role));
    return satisfied ? [] : requiredRoles;
  }

  private static secondFactor(
    requirement: AccessRequirement,
    actor: Actor,
    now: Date,
  ): AccessDecision {
    if (requirement.mfaMaxAgeMinutes === undefined) {
      return { outcome: AccessOutcome.Allowed };
    }
    if (!ActorGuards.isUser(actor)) {
      return { outcome: AccessOutcome.Forbidden, missing: [] };
    }
    const hasSecondFactor = actor.authMethods.some(
      (method) => method !== AuthMethodReference.Password,
    );
    const ageSeconds = now.getTime() / 1000 - actor.authTime;
    const withinWindow = ageSeconds <= requirement.mfaMaxAgeMinutes * 60;
    return hasSecondFactor && withinWindow
      ? { outcome: AccessOutcome.Allowed }
      : { outcome: AccessOutcome.StepUpRequired };
  }
}
