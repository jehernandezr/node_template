import { AmbientSagaScopes } from '../ambient-saga-scopes.js';
import { SagaInstanceBuilder } from '../../__tests__/utils/saga-instance-builder.js';

describe('AmbientSagaScopes', () => {
  it('run devuelve lo que devuelve body', async () => {
    const scopes = new AmbientSagaScopes();
    const instance = SagaInstanceBuilder.aSaga().build();

    await expect(scopes.run(instance, async () => 'resultado')).resolves.toBe(
      'resultado',
    );
  });

  it('propaga el error de body sin tragarlo', async () => {
    const scopes = new AmbientSagaScopes();
    const instance = SagaInstanceBuilder.aSaga().build();

    await expect(
      scopes.run(instance, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });
});
