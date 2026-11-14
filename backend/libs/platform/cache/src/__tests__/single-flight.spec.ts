import { SystemClock } from '@platform/kernel';
import { FixedClock } from '@platform/kernel/test-utils';
import { CallerWait } from '../caller-wait.js';
import { CacheErrorCode } from '../errors/cache-error-code.enum.js';
import { SingleFlight } from '../single-flight.js';
import { Deadline, PrimitivesErrorCode } from '@platform/primitives';

describe('SingleFlight', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs the function once for concurrent calls with the same key', async () => {
    const flight = new SingleFlight(new CallerWait(new FixedClock()));
    let runs = 0;
    const work = async (): Promise<string> => {
      runs += 1;
      return 'shared';
    };

    const results = await Promise.all([
      flight.run('key', work),
      flight.run('key', work),
    ]);

    expect(results).toEqual(['shared', 'shared']);
    expect(runs).toBe(1);
  });

  it('releases the key once the execution settles', async () => {
    const flight = new SingleFlight(new CallerWait(new FixedClock()));
    await flight.run('key', async () => 'value');
    expect(flight.size).toBe(0);
  });

  it('shares a failure with every waiter and releases the key', async () => {
    const flight = new SingleFlight(new CallerWait(new FixedClock()));
    const failure = new Error('load failed');
    const failing = async (): Promise<string> => {
      throw failure;
    };

    const outcomes = await Promise.allSettled([
      flight.run('key', failing),
      flight.run('key', failing),
    ]);

    expect(outcomes).toEqual([
      { status: 'rejected', reason: failure },
      { status: 'rejected', reason: failure },
    ]);
    expect(flight.size).toBe(0);
  });

  it('rejects keys longer than the limit without running the function', async () => {
    const flight = new SingleFlight(new CallerWait(new FixedClock()), {
      maxKeyLength: 4,
    });
    let runs = 0;
    await expect(
      flight.run('too-long', async () => {
        runs += 1;
        return 'never';
      }),
    ).rejects.toMatchObject({ code: CacheErrorCode.KeyTooLong });
    expect(runs).toBe(0);
  });

  it('does not start the function for a caller that is already cancelled', async () => {
    const flight = new SingleFlight(new CallerWait(new FixedClock()));
    const controller = new AbortController();
    controller.abort(new Error('gone'));
    let runs = 0;
    await expect(
      flight.run(
        'key',
        async () => {
          runs += 1;
          return 'never';
        },
        { signal: controller.signal },
      ),
    ).rejects.toThrow('gone');
    expect(runs).toBe(0);
  });

  it('lets a caller stop waiting while the shared execution keeps running', async () => {
    jest.useFakeTimers();
    const clock = new SystemClock();
    const flight = new SingleFlight(new CallerWait(clock));
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = (): void => resolve();
    });
    const shared = flight.run('key', async () => {
      await gate;
      return 'late';
    });
    const impatient = flight
      .run('key', async () => 'unused', {
        deadline: Deadline.after(10, clock),
      })
      .catch((error: unknown) => error);

    await jest.advanceTimersByTimeAsync(10);
    await expect(impatient).resolves.toMatchObject({
      code: PrimitivesErrorCode.DeadlineExceeded,
    });

    release();
    await expect(shared).resolves.toBe('late');
  });

  it.each([0, -1, 1.5, Number.NaN])(
    'rejects maxKeyLength %p at construction',
    (maxKeyLength) => {
      expect(
        () =>
          new SingleFlight(new CallerWait(new FixedClock()), { maxKeyLength }),
      ).toThrow(
        expect.objectContaining({ code: CacheErrorCode.InvalidArgument }),
      );
    },
  );
});
