import { AmbientSagaScopes } from '../ambient-saga-scopes.js';
import { SagaInstanceBuilder } from '../../__tests__/utils/saga-instance-builder.js';

describe('AmbientSagaScopes', () => {
  it('run returns what body returns', async () => {
    const scopes = new AmbientSagaScopes();
    const instance = SagaInstanceBuilder.aSaga().build();

    await expect(scopes.run(instance, async () => 'result')).resolves.toBe(
      'result',
    );
  });

  it('propagates the body error without swallowing it', async () => {
    const scopes = new AmbientSagaScopes();
    const instance = SagaInstanceBuilder.aSaga().build();

    await expect(
      scopes.run(instance, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });
});
