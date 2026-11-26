import {
  AccessResolver,
  AccessEvaluator,
  type AccessGrant,
  type Actor,
} from '@platform/auth';
import { ActorType } from '@platform/observability';
import { SystemClock } from '@platform/kernel';
import {
  AuthMethodReference,
  FeatureFlag,
  Permission,
  PlanFeature,
  TokenAudience,
} from '@contracts/identity';
import {
  Access,
  defineRoute,
  HttpMethod,
  type RouteDefinition,
} from '@contracts/platform';
import { EndpointAuthorizer } from '../endpoint-authorizer.js';

class CountingResolver extends AccessResolver {
  calls = 0;

  constructor(private readonly grant: AccessGrant) {
    super();
  }

  override async resolve(): Promise<AccessGrant> {
    this.calls += 1;
    return this.grant;
  }
}

const grant = (
  permissions: Permission[] = [],
  extra: Partial<AccessGrant> = {},
): AccessGrant => ({
  permissions,
  platformRoles: [],
  features: [],
  flags: [],
  permissionVersion: '1.1',
  ...extra,
});

const user: Actor = {
  kind: ActorType.User,
  userId: 'user',
  tenantId: 'tenant',
  homeTenantId: 'tenant',
  sessionId: 'session',
  audience: TokenAudience.Api,
  authMethods: [AuthMethodReference.Password],
  authTime: Math.floor(Date.now() / 1000),
  roles: [],
  platformRoles: [],
  permissionVersion: '1.1',
  region: 'us',
  sessionExpiresAt: Math.floor(Date.now() / 1000) + 3600,
  tokenId: 'token',
};

function routeWith(access: RouteDefinition['access']): RouteDefinition {
  return defineRoute({
    id: 'demo.items.get',
    method: HttpMethod.Get,
    path: '/v1/items',
    access,
    description: 'Test route.',
  });
}

describe('EndpointAuthorizer', () => {
  const evaluator = new AccessEvaluator();
  const clock = new SystemClock();

  it('lets a public route through without looking up the grant', async () => {
    const resolver = new CountingResolver(grant());

    await new EndpointAuthorizer(resolver, evaluator, clock).authorize(
      routeWith(Access.public()),
      user,
    );

    expect(resolver.calls).toBe(0);
  });

  it('looks up the grant only when the route asks for permissions', async () => {
    const resolver = new CountingResolver(grant());

    await new EndpointAuthorizer(resolver, evaluator, clock).authorize(
      routeWith(Access.authenticated()),
      user,
    );

    expect(resolver.calls).toBe(0);
  });

  it('forbids a route whose permission the user does not hold', async () => {
    const resolver = new CountingResolver(grant());
    const route = routeWith(
      Access.authenticated({ permissions: [Permission.TasksRead] }),
    );

    await expect(
      new EndpointAuthorizer(resolver, evaluator, clock).authorize(route, user),
    ).rejects.toMatchObject({
      code: 'PLATFORM.AUTH.FORBIDDEN',
      details: { missing: [Permission.TasksRead] },
    });
    expect(resolver.calls).toBe(1);
  });

  it('allows a route whose permission the user holds', async () => {
    const resolver = new CountingResolver(grant([Permission.TasksRead]));
    const route = routeWith(
      Access.authenticated({ permissions: [Permission.TasksRead] }),
    );

    await expect(
      new EndpointAuthorizer(resolver, evaluator, clock).authorize(route, user),
    ).resolves.toBeUndefined();
  });

  it('answers feature not included when the plan lacks the feature', async () => {
    const route = routeWith(
      Access.authenticated({ features: [PlanFeature.AdvancedReports] }),
    );

    await expect(
      new EndpointAuthorizer(
        new CountingResolver(grant()),
        evaluator,
        clock,
      ).authorize(route, user),
    ).rejects.toMatchObject({
      code: 'PLATFORM.ACCESS.FEATURE_NOT_INCLUDED',
      details: { missing: [PlanFeature.AdvancedReports] },
    });
  });

  it('answers flag disabled when the flag is off for the user', async () => {
    const route = routeWith(
      Access.authenticated({ flags: [FeatureFlag.NewReports] }),
    );

    await expect(
      new EndpointAuthorizer(
        new CountingResolver(grant()),
        evaluator,
        clock,
      ).authorize(route, user),
    ).rejects.toMatchObject({ code: 'PLATFORM.ACCESS.FLAG_DISABLED' });
  });

  it('lets a flagged route through when the user has the flag on', async () => {
    const route = routeWith(
      Access.authenticated({ flags: [FeatureFlag.NewReports] }),
    );
    const resolver = new CountingResolver(
      grant([], { flags: [FeatureFlag.NewReports] }),
    );

    await expect(
      new EndpointAuthorizer(resolver, evaluator, clock).authorize(route, user),
    ).resolves.toBeUndefined();
  });

  it('asks for step-up when the second factor is missing', async () => {
    const route = routeWith(Access.authenticated({ mfaMaxAgeMinutes: 5 }));

    await expect(
      new EndpointAuthorizer(
        new CountingResolver(grant()),
        evaluator,
        clock,
      ).authorize(route, user),
    ).rejects.toMatchObject({ code: 'IDENTITY.MFA.STEP_UP_REQUIRED' });
  });

  it('uses the permissions of a service account as its grant', async () => {
    const route = routeWith(
      Access.authenticated({ permissions: [Permission.TasksRead] }),
    );
    const serviceAccount: Actor = {
      kind: ActorType.ServiceAccount,
      serviceAccountId: 'sa',
      apiKeyId: 'key',
      tenantId: 'tenant',
      permissions: [Permission.TasksRead],
    };

    await expect(
      new EndpointAuthorizer(
        new CountingResolver(grant()),
        evaluator,
        clock,
      ).authorize(route, serviceAccount),
    ).resolves.toBeUndefined();
  });

  it('forbids the system actor on an authenticated route', async () => {
    const system: Actor = { kind: ActorType.System, name: 'job' };

    await expect(
      new EndpointAuthorizer(
        new CountingResolver(grant()),
        evaluator,
        clock,
      ).authorize(
        routeWith(
          Access.authenticated({ permissions: [Permission.TasksRead] }),
        ),
        system,
      ),
    ).rejects.toMatchObject({ code: 'PLATFORM.AUTH.FORBIDDEN' });
  });
});
