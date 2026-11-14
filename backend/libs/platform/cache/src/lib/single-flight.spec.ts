import { SystemClock } from '@platform/kernel';
import { FixedClock } from '@platform/kernel/testing';
import { Deadline, DeadlineExceededError } from '@platform/primitives';
import { CacheInvalidArgumentError, CacheKeyTooLongError } from './errors.js';
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

  it('lets one waiter abort without cancelling the shared execution', async () => {
    const flight = new SingleFlight();
    let finish: (value: string) => void = () => undefined;
    const loader = jest.fn(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    const controller = new AbortController();
    const reason = new Error('client left');

    const leaver = flight.run('k', loader, { signal: controller.signal });
    const stayer = flight.run('k', loader);
    controller.abort(reason);

    await expect(leaver).rejects.toBe(reason);
    finish('value');
    await expect(stayer).resolves.toBe('value');
    expect(loader).toHaveBeenCalledTimes(1);
    expect(flight.size).toBe(0);
  });

  it('lets the leader abort while followers still get the value', async () => {
    const flight = new SingleFlight();
    const controller = new AbortController();
    const loader = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return 'value';
    });

    const leader = flight.run('k', loader, { signal: controller.signal });
    const follower = flight.run('k', loader);
    controller.abort(new Error('leader left'));

    await expect(leader).rejects.toThrow('leader left');
    await expect(follower).resolves.toBe('value');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('rejects one waiter with DeadlineExceededError when its deadline expires', async () => {
    const flight = new SingleFlight();
    const loader = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
      return 'value';
    });

    const hurried = flight.run('k', loader, {
      deadline: Deadline.after(5, new SystemClock()),
    });
    const patient = flight.run('k', loader, {
      deadline: Deadline.after(5_000, new SystemClock()),
    });

    await expect(hurried).rejects.toBeInstanceOf(DeadlineExceededError);
    await expect(patient).resolves.toBe('value');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('does not start the execution for a caller that already gave up', async () => {
    const flight = new SingleFlight();
    const loader = jest.fn(async () => 'value');
    const clock = new FixedClock();

    await expect(
      flight.run('k', loader, { signal: AbortSignal.abort(new Error('gone')) }),
    ).rejects.toThrow('gone');
    await expect(
      flight.run('k', loader, { deadline: Deadline.after(0, clock) }),
    ).rejects.toBeInstanceOf(DeadlineExceededError);
    expect(loader).not.toHaveBeenCalled();
    expect(flight.size).toBe(0);
  });

  it('rejects keys longer than maxKeyLength', async () => {
    const flight = new SingleFlight({ maxKeyLength: 8 });
    const loader = jest.fn(async () => 'value');

    await expect(flight.run('123456789', loader)).rejects.toBeInstanceOf(
      CacheKeyTooLongError,
    );
    await expect(flight.run('12345678', loader)).resolves.toBe('value');
    expect(loader).toHaveBeenCalledTimes(1);
    expect(() => new SingleFlight({ maxKeyLength: 0 })).toThrow(
      CacheInvalidArgumentError,
    );
  });
});
