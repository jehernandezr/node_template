import {
  ActivateTenantOperation,
  CreateTenantOperation,
  DiscardTenantOperation,
  IdentityEvent,
  ReactivateTenantOperation,
  ReactivateUserOperation,
  RevocationReason,
  RevokeUserSessionsOperation,
  SuspendTenantOperation,
  SuspendUserOperation,
  TenantKind,
  TenantLifecycle,
  UserStatus,
} from '@contracts/identity';
import type { OperationDefinition } from '@contracts/platform';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import { CallOutcomeKind } from '@platform/primitives';
import {
  IdentityJourney,
  IdentityTestApp,
  ShardedUsers,
  TestIds,
} from './utils/index.js';

const runtime = new ContainerRuntime(process.env);

/** Lo que deja una operación: cuántos eventos de su tipo hay en el outbox y el estado de su fila. */
interface Effects {
  readonly events: number;
  readonly state: unknown;
}

/** Una operación interna que modifica datos, con lo que necesita antes y cómo mirar sus efectos. */
interface OperationCase {
  readonly operation: OperationDefinition;
  readonly arrange: (fixture: OperationFixture) => Promise<unknown>;
  readonly effects: (
    fixture: OperationFixture,
    input: unknown,
  ) => Promise<Effects>;
  readonly expected: Effects;
}

/**
 * Prepara tenants y usuarios para las operaciones internas y mira sus efectos desde fuera. Con
 * `requireScope` la llave de idempotencia vive en el catálogo y el resultado no se confirma con los efectos,
 * así que cada operación tiene que ser idempotente por su entrada: dos llaves distintas con la misma entrada
 * (o una caída entre el efecto y el registro de la llave) no pueden duplicar nada.
 */
class OperationFixture {
  private sequence = 0;

  constructor(private readonly app: IdentityTestApp) {}

  invoke(operation: OperationDefinition, input: unknown) {
    return this.app.internal().invoke(operation, input);
  }

  async tenant(): Promise<{ tenantId: string }> {
    const tenantId = TestIds.next();
    await this.invoke(CreateTenantOperation, await this.tenantInput(tenantId));
    return { tenantId };
  }

  async activeTenant(): Promise<{ tenantId: string }> {
    const input = await this.tenant();
    await this.invoke(ActivateTenantOperation, input);
    return input;
  }

  async suspendedTenant(): Promise<{ tenantId: string }> {
    const input = await this.activeTenant();
    await this.invoke(SuspendTenantOperation, input);
    return input;
  }

  /** La entrada de `CreateTenant` de un tenant nuevo con un dueño nuevo. */
  async tenantInput(tenantId: string) {
    const owner = await this.user();
    const slug = `idempotente-${this.sequence}`;
    return {
      tenantId,
      slug,
      name: slug,
      region: 'eu',
      kind: TenantKind.Organization,
      ownerUserId: owner.userId,
    };
  }

  async user(): Promise<{ userId: string; email: string }> {
    this.sequence += 1;
    const email = `idempotente.${this.sequence}@example.com`;
    const ref = await new ShardedUsers(this.app).register(email);
    return { userId: ref.userId, email };
  }

  async suspendedUser(): Promise<{ userId: string }> {
    const { userId } = await this.user();
    await this.invoke(SuspendUserOperation, { userId });
    return { userId };
  }

  async userWithSession(): Promise<{ userId: string }> {
    const { userId, email } = await this.user();
    await new IdentityJourney(this.app, email).signInWithEmailCode();
    return { userId };
  }

  async tenantEffects(
    tenantId: string,
    event: IdentityEvent | undefined,
  ): Promise<Effects> {
    const probe = this.app.shards();
    const shard = await probe.shardOfTenant(tenantId);
    const [tenant] = await probe.rowsIn<{ status: string }>(
      shard,
      `SELECT status FROM tenants WHERE id = '${tenantId}'`,
    );
    return {
      events: await this.events(
        shard,
        event,
        `envelope->>'tenantid' = '${tenantId}'`,
      ),
      state: tenant?.status ?? 'missing',
    };
  }

  async userEffects(userId: string, event: IdentityEvent): Promise<Effects> {
    const probe = this.app.shards();
    const [user] = await probe.shardsWith(
      `SELECT 1 FROM users WHERE id = '${userId}'`,
    );
    const [row] = await probe.rowsIn<{ status: string }>(
      String(user),
      `SELECT status FROM users WHERE id = '${userId}'`,
    );
    return {
      events: await this.events(
        String(user),
        event,
        `envelope->'data'->>'userId' = '${userId}'`,
      ),
      state: row?.status,
    };
  }

  async sessionEffects(userId: string): Promise<Effects> {
    const probe = this.app.shards();
    const [user] = await probe.shardsWith(
      `SELECT 1 FROM users WHERE id = '${userId}'`,
    );
    const [active] = await probe.rowsIn<{ count: string }>(
      String(user),
      `SELECT count(*) AS count FROM sessions WHERE user_id = '${userId}' AND revoked_at IS NULL`,
    );
    return {
      events: await this.events(
        String(user),
        IdentityEvent.SessionRevoked,
        `envelope->'data'->>'userId' = '${userId}'`,
      ),
      state: Number(active?.count),
    };
  }

  private async events(
    shard: string,
    event: IdentityEvent | undefined,
    condition: string,
  ): Promise<number> {
    if (event === undefined) {
      return 0;
    }
    const [row] = await this.app
      .shards()
      .rowsIn<{ count: string }>(
        shard,
        `SELECT count(*) AS count FROM outbox WHERE envelope->>'type' = '${event}' AND ${condition}`,
      );
    return Number(row?.count);
  }
}

const tenantIdOf = (input: unknown): string =>
  String((input as { tenantId: string }).tenantId);
const userIdOf = (input: unknown): string =>
  String((input as { userId: string }).userId);

const CASES: ReadonlyArray<[string, OperationCase]> = [
  [
    'CreateTenant',
    {
      operation: CreateTenantOperation,
      arrange: (fixture) => fixture.tenantInput(TestIds.next()),
      effects: (fixture, input) =>
        fixture.tenantEffects(tenantIdOf(input), IdentityEvent.TenantCreated),
      expected: { events: 1, state: TenantLifecycle.Provisioning },
    },
  ],
  [
    'ActivateTenant',
    {
      operation: ActivateTenantOperation,
      arrange: (fixture) => fixture.tenant(),
      effects: (fixture, input) =>
        fixture.tenantEffects(tenantIdOf(input), undefined),
      expected: { events: 0, state: TenantLifecycle.Active },
    },
  ],
  [
    'SuspendTenant',
    {
      operation: SuspendTenantOperation,
      arrange: (fixture) => fixture.activeTenant(),
      effects: (fixture, input) =>
        fixture.tenantEffects(tenantIdOf(input), IdentityEvent.TenantSuspended),
      expected: { events: 1, state: TenantLifecycle.Suspended },
    },
  ],
  [
    'ReactivateTenant',
    {
      operation: ReactivateTenantOperation,
      arrange: (fixture) => fixture.suspendedTenant(),
      effects: (fixture, input) =>
        fixture.tenantEffects(
          tenantIdOf(input),
          IdentityEvent.TenantReactivated,
        ),
      expected: { events: 1, state: TenantLifecycle.Active },
    },
  ],
  [
    'DiscardTenant',
    {
      operation: DiscardTenantOperation,
      arrange: (fixture) => fixture.tenant(),
      effects: (fixture, input) =>
        fixture.tenantEffects(tenantIdOf(input), undefined),
      expected: { events: 0, state: 'missing' },
    },
  ],
  [
    'SuspendUser',
    {
      operation: SuspendUserOperation,
      arrange: async (fixture) => ({ userId: (await fixture.user()).userId }),
      effects: (fixture, input) =>
        fixture.userEffects(userIdOf(input), IdentityEvent.UserSuspended),
      expected: { events: 1, state: UserStatus.Suspended },
    },
  ],
  [
    'ReactivateUser',
    {
      operation: ReactivateUserOperation,
      arrange: (fixture) => fixture.suspendedUser(),
      effects: (fixture, input) =>
        fixture.userEffects(userIdOf(input), IdentityEvent.UserReactivated),
      expected: { events: 1, state: UserStatus.Active },
    },
  ],
  [
    'RevokeUserSessions',
    {
      operation: RevokeUserSessionsOperation,
      arrange: async (fixture) => ({
        userId: (await fixture.userWithSession()).userId,
        reason: RevocationReason.AdminAction,
      }),
      effects: (fixture, input) => fixture.sessionEffects(userIdOf(input)),
      expected: { events: 1, state: 0 },
    },
  ],
];

runtime.describeIfAvailable(
  'internal operations with two keys for the same input',
  () => {
    jest.setTimeout(180_000);

    const app = new IdentityTestApp();
    let fixture: OperationFixture;

    beforeAll(async () => {
      await app.start();
      fixture = new OperationFixture(app);
    });

    afterAll(async () => {
      await app.stop();
    });

    it.each(CASES)(
      '%s does not repeat its effects or its events',
      async (_name, { operation, arrange, effects, expected }) => {
        const input = await arrange(fixture);

        const outcomes = [
          await fixture.invoke(operation, input),
          await fixture.invoke(operation, input),
        ];

        expect(outcomes.map((outcome) => outcome.kind)).toEqual([
          CallOutcomeKind.Success,
          CallOutcomeKind.Success,
        ]);
        await expect(effects(fixture, input)).resolves.toEqual(expected);
      },
    );
  },
);
