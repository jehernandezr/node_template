import { AccessKind, Access } from '@contracts/platform';
import {
  AuthMethodReference,
  FeatureFlag,
  PlanFeature,
  PlatformRole,
  Permission,
  TokenAudience,
} from '@contracts/identity';
import { ActorType } from '@platform/observability';
import type {
  Actor,
  ServiceAccountActor,
  SystemActor,
  UserActor,
} from '../../actor/actor.js';
import type { AccessGrant } from '../access-grant.js';
import { AccessEvaluator } from '../access-evaluator.js';
import { AccessOutcome } from '../access-outcome.enum.js';
import type { AccessRequirement } from '@contracts/platform';

/** `jti` del access token de prueba. */
const JTI = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f05';

const NOW = new Date('2026-01-15T12:00:00.000Z');
const NOW_SECONDS = NOW.getTime() / 1000;

/** Constructores de actores y grants para los casos del evaluador. */
class Fixtures {
  static user(overrides: Partial<UserActor> = {}): UserActor {
    return {
      kind: ActorType.User,
      userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f01',
      tenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f02',
      homeTenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f02',
      sessionId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f04',
      audience: TokenAudience.Api,
      authMethods: [AuthMethodReference.Password],
      authTime: NOW_SECONDS,
      roles: [],
      platformRoles: [],
      permissionVersion: '1.1',
      region: 'us',
      sessionExpiresAt: NOW_SECONDS + 3600,
      tokenId: JTI,
      ...overrides,
    };
  }

  static serviceAccount(): ServiceAccountActor {
    return {
      kind: ActorType.ServiceAccount,
      serviceAccountId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f07',
      apiKeyId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f08',
      tenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f02',
      permissions: [Permission.TasksRead],
    };
  }

  static system(): SystemActor {
    return { kind: ActorType.System, name: 'scheduler' };
  }

  static grant(overrides: Partial<AccessGrant> = {}): AccessGrant {
    return {
      permissions: [Permission.TasksRead, Permission.TasksWrite],
      platformRoles: [],
      features: [],
      flags: [],
      permissionVersion: '1.1',
      ...overrides,
    };
  }
}

const evaluator = new AccessEvaluator();

const decide = (
  requirement: AccessRequirement,
  actor: Actor,
  grant: AccessGrant = Fixtures.grant(),
): ReturnType<AccessEvaluator['evaluate']> =>
  evaluator.evaluate({ requirement, actor, grant, now: NOW });

describe('AccessEvaluator', () => {
  describe('public routes', () => {
    it('allows a system actor on a public route', () => {
      expect(decide(Access.public(), Fixtures.system())).toEqual({
        outcome: AccessOutcome.Allowed,
      });
    });
  });

  describe('permissions and roles', () => {
    it('forbids a system actor on an authenticated route with the exact missing list', () => {
      const requirement = Access.authenticated({
        permissions: [Permission.TasksRead],
        platformRoles: [PlatformRole.Support],
      });

      expect(decide(requirement, Fixtures.system())).toEqual({
        outcome: AccessOutcome.Forbidden,
        missing: [Permission.TasksRead, PlatformRole.Support],
      });
    });

    it('allows a user whose grant has every permission', () => {
      const requirement = Access.authenticated({
        permissions: [Permission.TasksRead, Permission.TasksWrite],
      });

      expect(decide(requirement, Fixtures.user())).toEqual({
        outcome: AccessOutcome.Allowed,
      });
    });

    it('forbids a user missing one permission with the exact missing list', () => {
      const requirement = Access.authenticated({
        permissions: [Permission.TasksRead, Permission.BillingWrite],
      });

      expect(decide(requirement, Fixtures.user())).toEqual({
        outcome: AccessOutcome.Forbidden,
        missing: [Permission.BillingWrite],
      });
    });

    it('allows a service account whose grant carries its permissions', () => {
      const requirement = Access.authenticated({
        permissions: [Permission.TasksRead],
      });

      expect(
        decide(
          requirement,
          Fixtures.serviceAccount(),
          Fixtures.grant({
            permissions: [Permission.TasksRead],
          }),
        ),
      ).toEqual({ outcome: AccessOutcome.Allowed });
    });

    it('forbids a service account on platform roles with the roles as missing', () => {
      const requirement = Access.authenticated({
        platformRoles: [PlatformRole.SuperAdmin],
      });

      expect(
        decide(
          requirement,
          Fixtures.serviceAccount(),
          Fixtures.grant({
            platformRoles: [PlatformRole.SuperAdmin],
          }),
        ),
      ).toEqual({
        outcome: AccessOutcome.Forbidden,
        missing: [PlatformRole.SuperAdmin],
      });
    });

    it('forbids a service account on MFA age with an empty missing list', () => {
      const requirement = Access.authenticated({ mfaMaxAgeMinutes: 10 });

      expect(decide(requirement, Fixtures.serviceAccount())).toEqual({
        outcome: AccessOutcome.Forbidden,
        missing: [],
      });
    });

    it('allows a user whose grant carries the platform role', () => {
      const requirement = Access.authenticated({
        platformRoles: [PlatformRole.Support, PlatformRole.Finance],
      });

      expect(
        decide(
          requirement,
          Fixtures.user(),
          Fixtures.grant({
            platformRoles: [PlatformRole.Finance],
          }),
        ),
      ).toEqual({ outcome: AccessOutcome.Allowed });
    });

    it('forbids a user whose grant lacks the platform role', () => {
      const requirement = Access.authenticated({
        platformRoles: [PlatformRole.Support],
      });

      expect(decide(requirement, Fixtures.user())).toEqual({
        outcome: AccessOutcome.Forbidden,
        missing: [PlatformRole.Support],
      });
    });
  });

  describe('plan features', () => {
    const requirement = Access.authenticated({
      permissions: [Permission.TasksRead],
      features: [PlanFeature.AdvancedReports],
    });

    it('allows a user whose tenant plan includes the feature', () => {
      const grant = Fixtures.grant({
        features: [PlanFeature.AdvancedReports],
      });

      expect(decide(requirement, Fixtures.user(), grant)).toEqual({
        outcome: AccessOutcome.Allowed,
      });
    });

    it('reports the features the plan does not include', () => {
      expect(decide(requirement, Fixtures.user())).toEqual({
        outcome: AccessOutcome.FeatureNotIncluded,
        missing: [PlanFeature.AdvancedReports],
      });
    });

    it('prefers a missing permission over a missing feature', () => {
      const grant = Fixtures.grant({ permissions: [] });

      expect(decide(requirement, Fixtures.user(), grant)).toEqual({
        outcome: AccessOutcome.Forbidden,
        missing: [Permission.TasksRead],
      });
    });
  });

  describe('feature flags', () => {
    const requirement = Access.authenticated({
      permissions: [Permission.BillingWrite],
      flags: [FeatureFlag.NewReports],
    });

    it('allows a user with the flag on and the permission held', () => {
      const grant = Fixtures.grant({
        permissions: [Permission.BillingWrite],
        flags: [FeatureFlag.NewReports],
      });

      expect(decide(requirement, Fixtures.user(), grant)).toEqual({
        outcome: AccessOutcome.Allowed,
      });
    });

    it('hides the route behind a disabled flag even without the permission', () => {
      expect(decide(requirement, Fixtures.user())).toEqual({
        outcome: AccessOutcome.FlagDisabled,
      });
    });
  });

  describe('MFA window of 10 minutes', () => {
    const requirement = Access.authenticated({ mfaMaxAgeMinutes: 10 });

    it.each<[string, readonly AuthMethodReference[], number]>([
      ['only a password', [AuthMethodReference.Password], 0],
      [
        'a second factor only in the past 11 minutes',
        [AuthMethodReference.Password, AuthMethodReference.Totp],
        11 * 60,
      ],
    ])('requires step-up for %s', (_name, methods, ageSeconds) => {
      const actor = Fixtures.user({
        authMethods: methods,
        authTime: NOW_SECONDS - ageSeconds,
      });

      expect(decide(requirement, actor)).toEqual({
        outcome: AccessOutcome.StepUpRequired,
      });
    });

    it.each<[string, readonly AuthMethodReference[], number]>([
      [
        'a TOTP one minute ago',
        [AuthMethodReference.Password, AuthMethodReference.Totp],
        60,
      ],
      ['a passkey with no age', [AuthMethodReference.Passkey], 0],
      [
        'a TOTP exactly 600 seconds ago',
        [AuthMethodReference.Password, AuthMethodReference.Totp],
        600,
      ],
    ])('allows %s', (_name, methods, ageSeconds) => {
      const actor = Fixtures.user({
        authMethods: methods,
        authTime: NOW_SECONDS - ageSeconds,
      });

      expect(decide(requirement, actor)).toEqual({
        outcome: AccessOutcome.Allowed,
      });
    });

    it('forbids instead of asking for step-up when a permission is also missing', () => {
      const combined = Access.authenticated({
        permissions: [Permission.BillingWrite],
        mfaMaxAgeMinutes: 10,
      });

      expect(decide(combined, Fixtures.user())).toEqual({
        outcome: AccessOutcome.Forbidden,
        missing: [Permission.BillingWrite],
      });
    });
  });

  describe('public requirement kind', () => {
    it('keeps the public kind distinct from authenticated', () => {
      expect(Access.public().kind).toBe(AccessKind.Public);
    });
  });
});
