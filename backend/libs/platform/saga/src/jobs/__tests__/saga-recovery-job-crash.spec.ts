import { CallOutcome } from '@platform/primitives';
import { AmbientSagaScopes } from '../../store/ambient-saga-scopes.js';
import { SagaStatus } from '../../model/saga-status.enum.js';
import { StepDirection } from '../../model/step-direction.enum.js';
import { StepStatus } from '../../model/step-status.enum.js';
import {
  CrashingSagaStore,
  FakeParticipant,
  ProcessDied,
  SagaEngineKit,
  ThreeStepSaga,
} from '../../__tests__/utils/index.js';
import { SagaRecoveryJob } from '../saga-recovery-job.js';

/** Más allá del lease por defecto de 30 s: el proceso caído ya no lo renueva. */
const LEASE_EXPIRED_MS = 30_001;

/** Motor de la primera corrida: el almacén de crash decide en qué paso muere el proceso. */
function crashingKit(participant: FakeParticipant, store: CrashingSagaStore) {
  return new SagaEngineKit({
    invoker: participant,
    definitions: [new ThreeStepSaga()],
    store,
    owner: 'node-a',
  });
}

describe('SagaRecoveryJob tras la caída del proceso', () => {
  it('retoma una saga que murió tras despachar el paso, con la misma llave y un solo efecto', async () => {
    const participant = new FakeParticipant();
    const store = new CrashingSagaStore();
    const kit = crashingKit(participant, store);
    store.crashAfterDispatch(1);

    await expect(
      kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' }),
    ).rejects.toBeInstanceOf(ProcessDied);
    expect(participant.operations()).toEqual(['a.create.v1']);
    const logged = (await store.steps('s1')).find(
      (entry) =>
        entry.stepIndex === 1 && entry.direction === StepDirection.Forward,
    );
    expect(logged?.status).toBe(StepStatus.Dispatched);

    kit.clock.advance(LEASE_EXPIRED_MS);
    const job = new SagaRecoveryJob({
      engine: kit.engineFor('node-b'),
      store: kit.store,
      scopes: new AmbientSagaScopes(),
      settings: kit.settings,
      clock: kit.clock,
    });
    await job.run();

    const saga = await kit.store.get('s1');
    expect(saga?.status).toBe(SagaStatus.Completed);
    expect(participant.keysOf('b.create.v1')).toEqual([logged?.idempotencyKey]);
    expect(participant.effects.get('b.create.v1')).toBe(1);
    expect(participant.liveResources).toBe(3);
  });

  it('retoma una saga que murió antes de guardar el resultado del paso y la deja Completed', async () => {
    const participant = new FakeParticipant();
    const store = new CrashingSagaStore();
    const kit = crashingKit(participant, store);
    store.crashBeforeOutcome(1);

    await expect(
      kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' }),
    ).rejects.toBeInstanceOf(ProcessDied);

    kit.clock.advance(LEASE_EXPIRED_MS);
    await new SagaRecoveryJob({
      engine: kit.engineFor('node-b'),
      store: kit.store,
      scopes: new AmbientSagaScopes(),
      settings: kit.settings,
      clock: kit.clock,
    }).run();

    expect((await kit.store.get('s1'))?.status).toBe(SagaStatus.Completed);
    expect(participant.keysOf('b.create.v1')).toHaveLength(2);
    expect(new Set(participant.keysOf('b.create.v1')).size).toBe(1);
    expect(participant.effects.get('b.create.v1')).toBe(1);
  });

  it('una saga de tres pasos que falla en el tercero compensa igual tras la caída', async () => {
    const participant = new FakeParticipant();
    participant.script('c.create.v1', CallOutcome.businessError('SOLD_OUT'));
    const store = new CrashingSagaStore();
    const kit = crashingKit(participant, store);
    store.crashBeforeOutcome(1);

    await expect(
      kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' }),
    ).rejects.toBeInstanceOf(ProcessDied);

    kit.clock.advance(LEASE_EXPIRED_MS);
    await new SagaRecoveryJob({
      engine: kit.engineFor('node-b'),
      store: kit.store,
      scopes: new AmbientSagaScopes(),
      settings: kit.settings,
      clock: kit.clock,
    }).run();

    const saga = await kit.store.get('s1');
    expect(saga?.status).toBe(SagaStatus.Compensated);
    expect(saga?.lastErrorCode).toBe('SOLD_OUT');
    expect(participant.removes()).toEqual(['b.remove.v1', 'a.remove.v1']);
    expect(participant.liveResources).toBe(0);
    expect(participant.effects.get('b.create.v1')).toBe(1);
  });
});
