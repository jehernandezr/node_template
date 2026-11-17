import {
  AccessKind,
  type RouteDefinition,
  PlatformErrorCode,
} from '@contracts/platform';
import {
  ActivateTenantOperation,
  CreateTenantOperation,
  identityContract,
  IdentityErrorCode,
  TenantKind,
  TenantRole,
} from '@contracts/identity';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import type { HttpTestClient } from '@platform/http/test-utils';
import { AccessMatrix, IdentityTestApp } from '../src/__tests__/utils/index.js';
import { SystemRolePermissions } from '../src/shared/constants/system-roles.constants.js';
import {
  IdentityJourney,
  TestIds,
  type SessionTokensBody,
} from '../src/__tests__/utils/index.js';

const runtime = new ContainerRuntime(process.env);

const ROUTES: readonly RouteDefinition[] = Object.values(
  identityContract.routes,
);
const AUTHENTICATED = ROUTES.filter(
  (route) => route.access.kind === AccessKind.Authenticated,
);
/** Las rutas que piden algún permiso que un miembro del tenant compartido no tiene. */
const BEYOND_MEMBER = AUTHENTICATED.filter((route) =>
  (route.access.permissions ?? []).some(
    (permission) =>
      !SystemRolePermissions[TenantRole.Member].some(
        (granted) => granted === permission,
      ),
  ),
);
const WITH_STEP_UP = AUTHENTICATED.filter(
  (route) =>
    route.access.mfaMaxAgeMinutes !== undefined &&
    (route.access.permissions ?? []).length === 0,
);

/** Las que además piden permisos, todos al alcance del dueño de un tenant. */
const WITH_STEP_UP_AND_PERMISSION = AUTHENTICATED.filter(
  (route) =>
    route.access.mfaMaxAgeMinutes !== undefined &&
    (route.access.permissions ?? []).length > 0 &&
    (route.access.permissions ?? []).every((permission) =>
      SystemRolePermissions[TenantRole.Owner].some(
        (granted) => granted === permission,
      ),
    ),
);

/** La ruta con sus parámetros reemplazados por ids válidos que no existen. */
function pathOf(route: RouteDefinition): string {
  return route.path.replace(/\{[^}]+\}/g, () => TestIds.next());
}

function send(
  client: HttpTestClient,
  route: RouteDefinition,
): ReturnType<HttpTestClient['send']> {
  return client.send(route.method, pathOf(route), {});
}

runtime.describeIfAvailable('identity access matrix', () => {
  jest.setTimeout(180_000);

  const app = new IdentityTestApp();
  const member = new IdentityJourney(app, 'mario.miembro@example.com');
  let withMfa: SessionTokensBody;
  let withoutMfa: SessionTokensBody;
  /** Dueño de una organización con una sesión sin segundo factor reciente. */
  let ownerWithoutMfa: string;

  beforeAll(async () => {
    await app.start();
    await member.register();
    withMfa = await member.signInWithEmailCode();
    const recognized = await member.native().post('/v1/auth/sign-in', {
      body: {
        email: member.email,
        password: IdentityJourney.PASSWORD,
        deviceId: IdentityJourney.deviceIdFrom(withMfa.accessToken),
      },
    });
    withoutMfa = (recognized.body as { tokens: SessionTokensBody }).tokens;
    // Su tenant predeterminado es el compartido, donde no administra nada: entra sin segundo factor y
    // después cambia a la organización de la que es dueño.
    const tenantId = TestIds.next();
    await app.internal().invoke(CreateTenantOperation, {
      tenantId,
      slug: 'matriz',
      name: 'Matriz',
      region: 'eu',
      kind: TenantKind.Organization,
      ownerUserId: IdentityJourney.userIdFrom(withMfa.accessToken),
    });
    await app.internal().invoke(ActivateTenantOperation, { tenantId });
    const switched = await member
      .bearer(withoutMfa.accessToken)
      .post('/v1/me/tenant-switch', { body: { tenantId } });
    ownerWithoutMfa = (switched.body as SessionTokensBody).accessToken;
  });

  afterAll(async () => {
    await app.stop();
  });

  it('has no public route outside the approved list', () => {
    const publicRoutes = ROUTES.filter(
      (route) => route.access.kind === AccessKind.Public,
    ).map((route) => route.id);

    expect([...publicRoutes].sort()).toEqual(
      [...AccessMatrix.APPROVED_PUBLIC_ROUTES].sort(),
    );
  });

  it.each(AUTHENTICATED.map((route) => [route.id, route]))(
    '%s rejects a request without a token',
    async (_, route) => {
      const response = await send(member.web(), route);

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        code: PlatformErrorCode.AuthUnauthenticated,
      });
    },
  );

  it.each(BEYOND_MEMBER.map((route) => [route.id, route]))(
    '%s rejects a member without the permission',
    async (_, route) => {
      const response = await send(member.bearer(withMfa.accessToken), route);

      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({
        code: PlatformErrorCode.AuthForbidden,
      });
    },
  );

  it.each(WITH_STEP_UP.map((route) => [route.id, route]))(
    '%s asks for step-up when the session has no recent second factor',
    async (_, route) => {
      const response = await send(member.bearer(withoutMfa.accessToken), route);

      expect(response.body).toMatchObject({
        code: IdentityErrorCode.MfaStepUpRequired,
      });
    },
  );

  it('covers routes that ask for a permission and a recent second factor', () => {
    expect(WITH_STEP_UP_AND_PERMISSION.length).toBeGreaterThan(0);
  });

  it.each(WITH_STEP_UP_AND_PERMISSION.map((route) => [route.id, route]))(
    '%s asks the owner for step-up when the session has no recent second factor',
    async (_, route) => {
      const response = await send(member.bearer(ownerWithoutMfa), route);

      expect(response.body).toMatchObject({
        code: IdentityErrorCode.MfaStepUpRequired,
      });
    },
  );
});
