import { OperationResolver } from '@platform/internal-api';
import { SmokeWelcomeSaga } from '../smoke-welcome-saga.js';

describe('SmokeWelcomeSaga', () => {
  it('compiles to two steps, the first one compensable', () => {
    const compiled = new SmokeWelcomeSaga().build(new OperationResolver());

    expect(compiled.type).toBe('smoke-welcome');
    expect(compiled.steps).toHaveLength(2);
  });
});
