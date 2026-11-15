import { SingleRelayScope } from '../single-relay-scope.js';

describe('SingleRelayScope', () => {
  it('runs the body once, without a partition context', async () => {
    let runs = 0;

    await new SingleRelayScope().forEach(async () => {
      runs += 1;
    });

    expect(runs).toBe(1);
  });

  it('propagates the error of the body', async () => {
    await expect(
      new SingleRelayScope().forEach(() =>
        Promise.reject(new Error('relay pass failed')),
      ),
    ).rejects.toThrow('relay pass failed');
  });
});
