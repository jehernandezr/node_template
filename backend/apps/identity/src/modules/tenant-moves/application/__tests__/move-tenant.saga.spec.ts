import { BillingOperation } from '@contracts/billing';
import { IdentityOperation } from '@contracts/identity';
import { NotificationsOperation } from '@contracts/notifications';
import { PlatformErrorCode } from '@contracts/platform';
import { ReportsOperation } from '@contracts/reports';
import { TasksOperation } from '@contracts/tasks';
import { CallOutcome } from '@platform/primitives';
import { AmbientSagaScopes, SagaRecoveryJob, SagaStatus } from '@platform/saga';
import {
  CrashingSagaStore,
  ProcessDied,
  SagaEngineKit,
} from '@platform/saga/test-utils';
import { RecordingParticipants } from '../../../../__tests__/utils/index.js';
import { MoveTenantSaga, type MoveTenantState } from '../move-tenant.saga.js';

const LEASE_EXPIRED_MS = 30_001;
const SAGA_ID = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f11';
const MOVE: MoveTenantState = {
  moveId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f12',
  tenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a05',
  targetGroup: 'sa-group-1',
  targetRegion: 'sa-east-1',
};

const SYNCS = [
  IdentityOperation.TenantMoveSync,
  TasksOperation.TenantMoveSync,
  NotificationsOperation.TenantMoveSync,
  ReportsOperation.TenantMoveSync,
  BillingOperation.TenantMoveSync,
];
const FINALIZES = [
  IdentityOperation.TenantMoveFinalize,
  TasksOperation.TenantMoveFinalize,
  NotificationsOperation.TenantMoveFinalize,
  ReportsOperation.TenantMoveFinalize,
  BillingOperation.TenantMoveFinalize,
];
const SWITCHES = [
  IdentityOperation.TenantMoveSwitch,
  TasksOperation.TenantMoveSwitch,
  NotificationsOperation.TenantMoveSwitch,
  ReportsOperation.TenantMoveSwitch,
  BillingOperation.TenantMoveSwitch,
];

const kitOf = (
  participants: RecordingParticipants,
  store = new CrashingSagaStore(),
) =>
  new SagaEngineKit({
    invoker: participants,
    definitions: [new MoveTenantSaga()],
    store,
  });

describe('MoveTenantSaga', () => {
  it('copies every service, freezes and verifies each one, and then points them all to the target', async () => {
    const participants = new RecordingParticipants();

    const saga = await kitOf(participants).sagas.start(MoveTenantSaga, MOVE, {
      sagaId: SAGA_ID,
    });

    expect(saga.status).toBe(SagaStatus.Completed);
    expect(participants.operations()).toEqual([
      ...SYNCS,
      ...FINALIZES,
      ...SWITCHES,
      IdentityOperation.FinishTenantMove,
    ]);
    for (const operation of participants.operations()) {
      expect(participants.inputOf(operation)).toEqual(MOVE);
    }
  });

  it('discards the copy of every service already touched when one cannot verify its data', async () => {
    const participants = new RecordingParticipants();
    participants.answer(
      ReportsOperation.TenantMoveFinalize,
      CallOutcome.businessError(PlatformErrorCode.ValidationInvalidInput),
    );

    const saga = await kitOf(participants).sagas.start(MoveTenantSaga, MOVE, {
      sagaId: SAGA_ID,
    });

    expect(saga.status).toBe(SagaStatus.Compensated);
    const aborts = participants
      .operations()
      .filter((operation) => operation.endsWith('.tenant-move.abort.v1'));
    expect(new Set(aborts)).toEqual(
      new Set([
        IdentityOperation.TenantMoveAbort,
        TasksOperation.TenantMoveAbort,
        NotificationsOperation.TenantMoveAbort,
        ReportsOperation.TenantMoveAbort,
        BillingOperation.TenantMoveAbort,
      ]),
    );
    expect(participants.operations()).not.toContain(
      IdentityOperation.TenantMoveSwitch,
    );
  });

  it('asks for intervention instead of moving the tenant back once a service points to the target', async () => {
    const participants = new RecordingParticipants();
    participants.answer(
      TasksOperation.TenantMoveSwitch,
      CallOutcome.businessError(PlatformErrorCode.ValidationInvalidInput),
    );

    const saga = await kitOf(participants).sagas.start(MoveTenantSaga, MOVE, {
      sagaId: SAGA_ID,
    });

    expect(saga.status).toBe(SagaStatus.RequiresIntervention);
    expect(
      participants
        .operations()
        .some((operation) => operation.endsWith('.tenant-move.abort.v1')),
    ).toBe(false);
    expect(participants.operations()).not.toContain(
      IdentityOperation.FinishTenantMove,
    );
  });

  it('resumes after a crash in the middle of a finalize and verifies that service once', async () => {
    const participants = new RecordingParticipants();
    const store = new CrashingSagaStore();
    const kit = kitOf(participants, store);
    store.crashBeforeOutcome(SYNCS.length + 1);

    await expect(
      kit.sagas.start(MoveTenantSaga, MOVE, { sagaId: SAGA_ID }),
    ).rejects.toBeInstanceOf(ProcessDied);
    kit.clock.advance(LEASE_EXPIRED_MS);
    await new SagaRecoveryJob({
      engine: kit.engineFor('node-b'),
      store: kit.store,
      scopes: new AmbientSagaScopes(),
      settings: kit.settings,
      clock: kit.clock,
    }).run();

    expect((await kit.store.get(SAGA_ID))?.status).toBe(SagaStatus.Completed);
    expect(participants.effectsOf(TasksOperation.TenantMoveFinalize)).toBe(1);
    expect(participants.effectsOf(BillingOperation.TenantMoveSwitch)).toBe(1);
  });
});
