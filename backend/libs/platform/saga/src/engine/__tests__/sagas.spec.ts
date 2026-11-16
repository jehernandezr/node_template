import { SagaDefinition } from '../../definition/saga-definition.js';
import { SagaErrorCode } from '../../errors/saga-error-code.enum.js';
import { SagaError } from '../../errors/saga-error.js';
import { FakeParticipant } from '../../__tests__/utils/fake-participant.js';
import { SagaEngineKit } from '../../__tests__/utils/saga-engine-kit.js';
import { ThreeStepSaga } from '../../__tests__/utils/sample-sagas.js';
import { SagaStatus } from '../../model/saga-status.enum.js';

class NotRegisteredSaga extends SagaDefinition<object> {
  readonly type = 'not-registered';

  protected define(): void {
    // Sin pasos: nunca se registra en el kit.
  }
}

describe('Sagas', () => {
  it('arranca la saga de la clase registrada', async () => {
    const kit = new SagaEngineKit({
      invoker: new FakeParticipant(),
      definitions: [new ThreeStepSaga()],
    });

    const result = await kit.sagas.start(ThreeStepSaga, {});

    expect(result.status).toBe(SagaStatus.Completed);
  });

  it('rechaza una clase no registrada con UnknownDefinition', () => {
    const kit = new SagaEngineKit({
      invoker: new FakeParticipant(),
      definitions: [new ThreeStepSaga()],
    });

    let error: unknown;
    try {
      void kit.sagas.start(NotRegisteredSaga, {});
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(SagaError);
    expect((error as SagaError).code).toBe(SagaErrorCode.UnknownDefinition);
  });
});
