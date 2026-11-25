import {
  IdentityErrorCode,
  IdentityOperation,
  TenantKind,
  TenantLifecycle,
} from '@contracts/identity';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { CallOutcome } from '@platform/primitives';
import { SagaStatus } from '@platform/saga';
import { SagaEngineKit } from '@platform/saga/test-utils';
import { regionsConfigSchema, ServiceRegions } from '@platform/service';
import {
  TenantMoveTargets,
  tenantMoveConfigSchema,
} from '@platform/tenant-move';
import { IdentitySettings } from '../../../../config/identity-settings.js';
import {
  RecordingParticipants,
  StaticAppConfig,
  TestShardScopes,
} from '../../../../__tests__/utils/index.js';
import { IdentitySagas } from '../../../sagas/index.js';
import { InMemorySagaDirectory } from '../../../sagas/__tests__/utils/index.js';
import { InMemoryTenantsFacade } from '../../../tenants/__tests__/utils/index.js';
import { TenantMoveStatus } from '../../domain/tenant-move-status.enum.js';
import { InMemoryTenantMoveLog } from '../../__tests__/utils/index.js';
import { MoveTenantSaga } from '../move-tenant.saga.js';
import { StartTenantMove } from '../start-tenant-move.use-case.js';

const PLATFORM = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a00';
const ACME = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a05';
const SHARED = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a06';

const tenantOf = (id: string, kind: TenantKind) => ({
  id,
  slug: id,
  name: id,
  region: 'us-east-1',
  kind,
  status: TenantLifecycle.Active,
});

describe('StartTenantMove', () => {
  const setup = (participants = new RecordingParticipants()) => {
    const kit = new SagaEngineKit({
      invoker: participants,
      definitions: [new MoveTenantSaga()],
    });
    const log = new InMemoryTenantMoveLog();
    const start = new StartTenantMove(
      new InMemoryTenantsFacade()
        .add(tenantOf(ACME, TenantKind.Organization))
        .add(tenantOf(SHARED, TenantKind.SharedCustomers)),
      new TenantMoveTargets({
        'sa-group-1': { region: 'sa-east-1', shard: 'identity_shard_b0' },
        'eu-group-1': { region: 'eu-west-1', shard: 'identity_shard_e0' },
      }),
      new ServiceRegions(
        regionsConfigSchema.parse({
          REGIONS: JSON.stringify(
            ['us-east-1', 'sa-east-1'].map((code) => ({
              code,
              apiBaseUrl: `https://${code}.api.test`,
              issuer: `https://${code}.id.test`,
            })),
          ),
          SERVICE_REGION: 'us-east-1',
        }),
      ),
      log,
      new IdentitySagas(
        kit.sagas,
        kit.store,
        new InMemorySagaDirectory(),
        TestShardScopes.create(),
      ),
      new SequentialIdGenerator(),
      new FixedClock(),
      new IdentitySettings(
        new StaticAppConfig({ IDENTITY_PLATFORM_TENANT_ID: PLATFORM }),
      ),
      tenantMoveConfigSchema.parse({ TENANT_MOVE_DEADLINE_MS: '3600000' }),
    );
    return { kit, log, participants, start };
  };

  it('records the move and runs the saga in the shard of the platform tenant', async () => {
    const { kit, log, participants, start } = setup();

    const launch = await start.execute({
      tenantId: ACME,
      targetGroup: 'sa-group-1',
    });

    const saga = await kit.store.get(launch.sagaId);
    expect(saga).toMatchObject({
      status: SagaStatus.Completed,
      tenantId: PLATFORM,
    });
    expect(saga?.deadlineAt?.getTime()).toBe(
      (saga?.createdAt.getTime() ?? 0) + 3_600_000,
    );
    expect(log.find(launch.moveId)).toMatchObject({
      tenantId: ACME,
      targetGroup: 'sa-group-1',
      targetRegion: 'sa-east-1',
      sagaId: launch.sagaId,
    });
    expect(participants.inputOf(IdentityOperation.TenantMoveSync)).toEqual({
      moveId: launch.moveId,
      tenantId: ACME,
      targetGroup: 'sa-group-1',
      targetRegion: 'sa-east-1',
    });
  });

  it('refuses to move the shared customers tenant', async () => {
    const { start } = setup();

    await expect(
      start.execute({ tenantId: SHARED, targetGroup: 'sa-group-1' }),
    ).rejects.toMatchObject({ code: IdentityErrorCode.TenantMoveNotMovable });
  });

  it.each(['missing-group', 'eu-group-1'])(
    'refuses the target %s, which is not a group of a region of the deployment',
    async (targetGroup) => {
      const { start } = setup();

      await expect(
        start.execute({ tenantId: ACME, targetGroup }),
      ).rejects.toMatchObject({
        code: IdentityErrorCode.TenantMoveUnknownTarget,
      });
    },
  );

  it('refuses a second move while the first one is still waiting to retry', async () => {
    const participants = new RecordingParticipants();
    participants.answer(
      IdentityOperation.TenantMoveSync,
      CallOutcome.transientFailure('round pending'),
    );
    const { start } = setup(participants);
    await start.execute({ tenantId: ACME, targetGroup: 'sa-group-1' });

    await expect(
      start.execute({ tenantId: ACME, targetGroup: 'sa-group-1' }),
    ).rejects.toMatchObject({ code: IdentityErrorCode.TenantMoveInProgress });
  });

  it('closes as aborted a move whose saga never ran and starts the new one', async () => {
    const { log, start } = setup();
    await log.start({
      moveId: 'stale-move',
      tenantId: ACME,
      targetGroup: 'sa-group-1',
      targetRegion: 'sa-east-1',
      sagaId: 'saga-that-never-started',
      status: TenantMoveStatus.Running,
      startedAt: new Date(0),
    });

    const launch = await start.execute({
      tenantId: ACME,
      targetGroup: 'sa-group-1',
    });

    expect(log.find('stale-move')?.status).toBe(TenantMoveStatus.Aborted);
    expect(log.find(launch.moveId)?.status).toBe(TenantMoveStatus.Running);
  });
});
