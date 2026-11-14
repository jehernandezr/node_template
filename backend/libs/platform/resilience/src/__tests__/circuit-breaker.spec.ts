import { FixedClock } from '@platform/kernel/test-utils';
import { CircuitState, ConsecutiveCircuitBreaker } from '../circuit-breaker.js';

class Counted extends Error {}
class Ignored extends Error {}
class Rejected extends Error {}

function setup(consecutiveFailures = 2) {
  const clock = new FixedClock();
  const events: string[] = [];
  const breaker = new ConsecutiveCircuitBreaker({
    consecutiveFailures,
    halfOpenAfterMs: 1_000,
    clock,
    counts: (error) => error instanceof Counted,
    rejectWith: () => new Rejected(),
    onBreak: () => events.push('break'),
    onHalfOpen: () => events.push('half-open'),
    onReset: () => events.push('reset'),
  });
  const fail = (error: Error) => breaker.execute(() => Promise.reject(error));
  return { clock, events, breaker, fail };
}

describe('ConsecutiveCircuitBreaker', () => {
  it('opens after N consecutive counted failures and rejects without running', async () => {
    const { breaker, events, fail } = setup();
    await expect(fail(new Counted())).rejects.toBeInstanceOf(Counted);
    await expect(fail(new Counted())).rejects.toBeInstanceOf(Counted);
    expect(breaker.state).toBe(CircuitState.Open);
    expect(events).toEqual(['break']);

    const fn = jest.fn(async () => 'ok');
    await expect(breaker.execute(fn)).rejects.toBeInstanceOf(Rejected);
    expect(fn).not.toHaveBeenCalled();
  });

  it('resets the count on success and ignores uncounted errors', async () => {
    const { breaker, fail } = setup();
    await fail(new Counted()).catch(() => undefined);
    await breaker.execute(async () => 'ok');
    await fail(new Counted()).catch(() => undefined);
    await fail(new Ignored()).catch(() => undefined);
    expect(breaker.state).toBe(CircuitState.Closed);
  });

  it('half-opens after halfOpenAfterMs of the injected clock', async () => {
    const { breaker, clock, events, fail } = setup(1);
    await fail(new Counted()).catch(() => undefined);

    clock.advance(999);
    await expect(breaker.execute(async () => 'ok')).rejects.toBeInstanceOf(
      Rejected,
    );

    clock.advance(1);
    await expect(breaker.execute(async () => 'ok')).resolves.toBe('ok');
    expect(breaker.state).toBe(CircuitState.Closed);
    expect(events).toEqual(['break', 'half-open', 'reset']);
  });

  it('opens again when the trial fails with a counted error', async () => {
    const { breaker, clock, events, fail } = setup(1);
    await fail(new Counted()).catch(() => undefined);
    clock.advance(1_000);
    await expect(fail(new Counted())).rejects.toBeInstanceOf(Counted);
    expect(breaker.state).toBe(CircuitState.Open);
    expect(events).toEqual(['break', 'half-open', 'break']);
  });

  it('closes when the trial fails with an uncounted error', async () => {
    const { breaker, clock, fail } = setup(1);
    await fail(new Counted()).catch(() => undefined);
    clock.advance(1_000);
    await expect(fail(new Ignored())).rejects.toBeInstanceOf(Ignored);
    expect(breaker.state).toBe(CircuitState.Closed);
  });

  it('lets a single trial run and rejects the others while it is in flight', async () => {
    const { breaker, clock, fail } = setup(1);
    await fail(new Counted()).catch(() => undefined);
    clock.advance(1_000);

    let finish: (value: string) => void = () => undefined;
    const trial = breaker.execute(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    await expect(breaker.execute(async () => 'other')).rejects.toBeInstanceOf(
      Rejected,
    );
    finish('trial');
    await expect(trial).resolves.toBe('trial');
    expect(breaker.state).toBe(CircuitState.Closed);
  });
});
