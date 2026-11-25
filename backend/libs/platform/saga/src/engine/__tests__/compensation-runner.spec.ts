import { CallOutcome } from '@platform/primitives';
import { SagaErrorCode } from '../../errors/saga-error-code.enum.js';
import { FakeParticipant } from '../../__tests__/utils/fake-participant.js';
import { SagaEngineKit } from '../../__tests__/utils/saga-engine-kit.js';
import {
  CompensationInputSaga,
  LookupSaga,
  ThreeStepSaga,
  VolatileSaga,
} from '../../__tests__/utils/sample-sagas.js';
import { SagaEventKind } from '../../model/saga-event-kind.enum.js';
import { SagaStatus } from '../../model/saga-status.enum.js';
import type { SagaDefinition } from '../../definition/saga-definition.js';

function setup(definitions: SagaDefinition<unknown>[] = [new ThreeStepSaga()]) {
  const participant = new FakeParticipant();
  const kit = new SagaEngineKit({ invoker: participant, definitions });
  const events: SagaEventKind[] = [];
  kit.events.subscribe((event) => {
    events.push(event.kind);
  });
  return { kit, participant, events };
}

describe('CompensationRunner', () => {
  it('skips read-only steps when undoing', async () => {
    const { kit, participant } = setup([new LookupSaga()]);
    participant.script('c.create.v1', CallOutcome.businessError('SOLD_OUT'));

    const result = await kit.sagas.start(LookupSaga, {}, { sagaId: 's1' });

    expect(result.status).toBe(SagaStatus.Compensated);
    expect(participant.operations()).toEqual([
      'a.create.v1',
      'a.lookup.v1',
      'c.create.v1',
      'a.remove.v1',
    ]);
  });

  it('requires intervention if the compensation input cannot be built', async () => {
    const { kit, participant } = setup([new CompensationInputSaga()]);
    participant.script('c.create.v1', CallOutcome.businessError('SOLD_OUT'));

    const result = await kit.sagas.start(
      CompensationInputSaga,
      {},
      { sagaId: 's1' },
    );

    expect(result.status).toBe(SagaStatus.RequiresIntervention);
    expect(result.lastErrorCode).toBe(SagaErrorCode.InputBuildFailed);
    expect(result.lastErrorDetail).toBe('Error: no reference');
    expect(participant.removes()).toEqual([]);
  });

  it('moves to CompensationFailed on a protocol violation and emits the alert', async () => {
    const { kit, participant, events } = setup();
    participant.script('c.create.v1', CallOutcome.businessError('SOLD_OUT'));
    participant.script('b.remove.v1', CallOutcome.protocolViolation('broken'));

    const result = await kit.sagas.start(ThreeStepSaga, {}, { sagaId: 's1' });

    expect(result.status).toBe(SagaStatus.CompensationFailed);
    expect(result.lastErrorCode).toBe(SagaErrorCode.ProtocolViolation);
    expect(result.lastErrorDetail).toBe('broken');
    expect(events).toContain(SagaEventKind.ProtocolViolation);
    expect(participant.removes()).toEqual(['b.remove.v1']);
  });

  it('retries the compensation with the stored input without rebuilding it', async () => {
    const saga = new VolatileSaga();
    const { kit, participant } = setup([saga]);
    participant.script('c.create.v1', CallOutcome.businessError('SOLD_OUT'));
    participant.script('b.remove.v1', CallOutcome.transientFailure('timeout'));
    await kit.sagas.start(VolatileSaga, {}, { sagaId: 's1' });

    kit.clock.advance(1_000);
    const result = await kit.engineFor('node-b').resume('s1');

    expect(result.status).toBe(SagaStatus.Compensated);
    const removes = participant.calls.filter(
      (c) => c.operationId === 'b.remove.v1',
    );
    expect(removes).toHaveLength(2);
    expect(removes[1]?.input).toEqual(removes[0]?.input);
    expect(saga.counts.compensations).toBe(1);
  });
});
