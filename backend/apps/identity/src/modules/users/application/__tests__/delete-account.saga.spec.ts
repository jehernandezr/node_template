import { IdentityErrorCode, IdentityOperation } from '@contracts/identity';
import { NotificationsOperation } from '@contracts/notifications';
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
import { DeleteAccountSaga } from '../delete-account.saga.js';

const LEASE_EXPIRED_MS = 30_001;
const SAGA_ID = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f02';
const USER = {
  userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9b01',
  homeTenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01',
};

const kitOf = (
  participants: RecordingParticipants,
  store = new CrashingSagaStore(),
) =>
  new SagaEngineKit({
    invoker: participants,
    definitions: [new DeleteAccountSaga()],
    store,
  });

const recoverWith = (kit: SagaEngineKit) =>
  new SagaRecoveryJob({
    engine: kit.engineFor('node-b'),
    store: kit.store,
    scopes: new AmbientSagaScopes(),
    settings: kit.settings,
    clock: kit.clock,
  }).run();

describe('DeleteAccountSaga', () => {
  it('suspends the user, has every service erase its data and erases the user last', async () => {
    const participants = new RecordingParticipants();

    const saga = await kitOf(participants).sagas.start(
      DeleteAccountSaga,
      { user: USER },
      { sagaId: SAGA_ID },
    );

    expect(saga.status).toBe(SagaStatus.Completed);
    expect(participants.operations()).toEqual([
      IdentityOperation.SuspendUser,
      TasksOperation.EraseUserData,
      NotificationsOperation.EraseUserData,
      ReportsOperation.EraseUserData,
      IdentityOperation.EraseUser,
    ]);
    expect(participants.inputOf(TasksOperation.EraseUserData)).toEqual({
      user: USER,
    });
    expect(participants.inputOf(IdentityOperation.EraseUser)).toEqual({
      userId: USER.userId,
    });
  });

  it('erases nothing when the user cannot be suspended', async () => {
    const participants = new RecordingParticipants();
    participants.answer(
      IdentityOperation.SuspendUser,
      CallOutcome.businessError(IdentityErrorCode.UserNotFound),
    );

    const saga = await kitOf(participants).sagas.start(
      DeleteAccountSaga,
      { user: USER },
      { sagaId: SAGA_ID },
    );

    expect(saga.status).toBe(SagaStatus.Compensated);
    expect(participants.operations()).toEqual([IdentityOperation.SuspendUser]);
  });

  it('asks for intervention, without reactivating the user, when a service refuses to erase after the pivot', async () => {
    const participants = new RecordingParticipants();
    participants.answer(
      ReportsOperation.EraseUserData,
      CallOutcome.businessError(IdentityErrorCode.UserNotFound),
    );

    const saga = await kitOf(participants).sagas.start(
      DeleteAccountSaga,
      { user: USER },
      { sagaId: SAGA_ID },
    );

    expect(saga.status).toBe(SagaStatus.RequiresIntervention);
    expect(participants.operations()).not.toContain(
      IdentityOperation.ReactivateUser,
    );
    expect(participants.operations()).not.toContain(
      IdentityOperation.EraseUser,
    );
  });

  it('resumes after a crash while notifications erased and finishes with each erase applied once', async () => {
    const participants = new RecordingParticipants();
    const store = new CrashingSagaStore();
    const kit = kitOf(participants, store);
    store.crashBeforeOutcome(2);

    await expect(
      kit.sagas.start(DeleteAccountSaga, { user: USER }, { sagaId: SAGA_ID }),
    ).rejects.toBeInstanceOf(ProcessDied);
    kit.clock.advance(LEASE_EXPIRED_MS);
    await recoverWith(kit);

    expect((await kit.store.get(SAGA_ID))?.status).toBe(SagaStatus.Completed);
    expect(
      new Set(participants.keysOf(NotificationsOperation.EraseUserData)).size,
    ).toBe(1);
    expect(participants.effectsOf(NotificationsOperation.EraseUserData)).toBe(
      1,
    );
    expect(participants.effectsOf(IdentityOperation.EraseUser)).toBe(1);
  });

  it('resumes a saga that died right after dispatching the suspension and suspends the user once', async () => {
    const participants = new RecordingParticipants();
    const store = new CrashingSagaStore();
    const kit = kitOf(participants, store);
    store.crashAfterDispatch(0);

    await expect(
      kit.sagas.start(DeleteAccountSaga, { user: USER }, { sagaId: SAGA_ID }),
    ).rejects.toBeInstanceOf(ProcessDied);
    kit.clock.advance(LEASE_EXPIRED_MS);
    await recoverWith(kit);

    expect(participants.effectsOf(IdentityOperation.SuspendUser)).toBe(1);
    expect((await kit.store.get(SAGA_ID))?.status).toBe(SagaStatus.Completed);
  });
});
