import { AccessKind } from '@contracts/platform';
import { AuthMethodReference } from '@contracts/identity';
import { ActorGuards } from '../actor/actor-guards.js';
import type { AccessDecision } from './access-decision.js';
import type { AccessEvaluation } from './access-evaluation.js';
import { AccessOutcome } from './access-outcome.enum.js';

/**
 * Aplica el `AccessRequirement` de una ruta a un actor, sin estado y sin I/O.
 *
 * - Ruta pública: `Allowed`.
 * - `SystemActor`: `Forbidden` en cualquier ruta autenticada.
 * - `permissions`: el grant las tiene todas (`missing` lista las que faltan).
 * - `platformRoles`: el grant tiene alguno. Un `ServiceAccountActor` nunca lo cumple.
 * - `mfaMaxAgeMinutes`: el actor es un usuario cuyo `authMethods` incluye algún método distinto de `Password` y `now - authTime` cabe en la ventana. Un `ServiceAccountActor` nunca lo cumple y recibe `Forbidden`.
 * - Con varios incumplimientos gana `Forbidden` sobre `StepUpRequired`.
 */
export class AccessEvaluator {
  evaluate(evaluation: AccessEvaluation): AccessDecision {
    const { requirement, actor, grant, now } = evaluation;
    if (requirement.kind === AccessKind.Public) {
      return { outcome: AccessOutcome.Allowed };
    }

    const requiredPermissions = requirement.permissions ?? [];
    const requiredRoles = requirement.platformRoles ?? [];
    if (ActorGuards.isSystem(actor)) {
      return {
        outcome: AccessOutcome.Forbidden,
        missing: [...requiredPermissions, ...requiredRoles],
      };
    }

    const owned = new Set<string>(grant.permissions);
    const missing: string[] = requiredPermissions.filter(
      (permission) => !owned.has(permission),
    );

    if (requiredRoles.length > 0) {
      const ownedRoles = new Set<string>(grant.platformRoles);
      const satisfied =
        ActorGuards.isUser(actor) &&
        requiredRoles.some((role) => ownedRoles.has(role));
      if (!satisfied) {
        missing.push(...requiredRoles);
      }
    }

    if (missing.length > 0) {
      return { outcome: AccessOutcome.Forbidden, missing };
    }

    if (requirement.mfaMaxAgeMinutes !== undefined) {
      if (!ActorGuards.isUser(actor)) {
        return { outcome: AccessOutcome.Forbidden, missing: [] };
      }
      const hasSecondFactor = actor.authMethods.some(
        (method) => method !== AuthMethodReference.Password,
      );
      const ageSeconds = now.getTime() / 1000 - actor.authTime;
      const withinWindow = ageSeconds <= requirement.mfaMaxAgeMinutes * 60;
      if (!hasSecondFactor || !withinWindow) {
        return { outcome: AccessOutcome.StepUpRequired };
      }
    }

    return { outcome: AccessOutcome.Allowed };
  }
}
