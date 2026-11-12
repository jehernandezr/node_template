import { SingleFlight } from './single-flight.js';

describe('SingleFlight', () => {
  it('runs the loader once for concurrent calls with the same key', async () => {
    const flight = new SingleFlight();
    const loader = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return 'value';
    });

    const results = await Promise.all(
      Array.from({ length: 10 }, () => flight.run('k', loader)),
    );

    expect(loader).toHaveBeenCalledTimes(1);
    expect(results.every((result) => result === 'value')).toBe(true);
  });

  it('shares an error with every waiter', async () => {
    const flight = new SingleFlight();
    const failure = new Error('boom');
    const loader = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      throw failure;
    });

    const outcomes = await Promise.allSettled(
      Array.from({ length: 5 }, () => flight.run('k', loader)),
    );

    expect(loader).toHaveBeenCalledTimes(1);
    for (const outcome of outcomes) {
      expect(outcome).toEqual({ status: 'rejected', reason: failure });
    }
  });

  it('releases the key once the execution settles', async () => {
    const flight = new SingleFlight();
    const loader = jest.fn(async () => 'v');

    await flight.run('k', loader);
    await flight.run('k', loader);

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('releases the key after a failure so the next call retries', async () => {
    const flight = new SingleFlight();
    const loader = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error('first'))
      .mockResolvedValueOnce('second');

    await expect(flight.run('k', loader)).rejects.toThrow('first');
    await expect(flight.run('k', loader)).resolves.toBe('second');
  });
});
