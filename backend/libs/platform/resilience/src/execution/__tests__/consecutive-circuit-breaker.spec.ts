import { FixedClock } from '@platform/kernel/test-utils';
import { CircuitState } from '../circuit-state.enum.js';
import { ConsecutiveCircuitBreaker } from '../consecutive-circuit-breaker.js';
import { Deferred } from '../../__tests__/utils/index.js';

interface Hooks {
  breaks: unknown[];
  halfOpens: number;
  resets: number;
}

function breaker(
  clock: FixedClock,
  hooks: Hooks,
  consecutiveFailures = 2,
): ConsecutiveCircuitBreaker {
  return new ConsecutiveCircuitBreaker({
    consecutiveFailures,
    halfOpenAfterMs: 100,
    clock,
    counts: (error) => error instanceof Error && error.message === 'counted',
    rejectWith: () => new Error('open'),
    onBreak: (error) => {
      hooks.breaks.push(error);
    },
    onHalfOpen: () => {
      hooks.halfOpens += 1;
    },
    onReset: () => {
      hooks.resets += 1;
    },
  });
}

const counted = (): Promise<never> => Promise.reject(new Error('counted'));
const uncounted = (): Promise<never> => Promise.reject(new Error('other'));

describe('ConsecutiveCircuitBreaker', () => {
  it('opens after N consecutive counted failures and rejects without running', async () => {
    const hooks: Hooks = { breaks: [], halfOpens: 0, resets: 0 };
    const cb = breaker(new FixedClock(), hooks);
    await expect(cb.execute(counted)).rejects.toThrow('counted');
    await expect(cb.execute(counted)).rejects.toThrow('counted');
    expect(cb.state).toBe(CircuitState.Open);
    let ran = false;
    await expect(
      cb.execute(async () => {
        ran = true;
        return 'x';
      }),
    ).rejects.toThrow('open');
    expect(ran).toBe(false);
    expect(hooks.breaks).toHaveLength(1);
  });

  it('resets the count on success and ignores uncounted errors', async () => {
    const hooks: Hooks = { breaks: [], halfOpens: 0, resets: 0 };
    const cb = breaker(new FixedClock(), hooks);
    await expect(cb.execute(counted)).rejects.toThrow();
    await expect(cb.execute(async () => 'ok')).resolves.toBe('ok');
    await expect(cb.execute(counted)).rejects.toThrow();
    await expect(cb.execute(uncounted)).rejects.toThrow('other');
    expect(cb.state).toBe(CircuitState.Closed);
  });

  it('half-opens after halfOpenAfterMs of the injected clock', async () => {
    const clock = new FixedClock();
    const hooks: Hooks = { breaks: [], halfOpens: 0, resets: 0 };
    const cb = breaker(clock, hooks, 1);
    await expect(cb.execute(counted)).rejects.toThrow();
    clock.advance(99);
    await expect(cb.execute(async () => 'x')).rejects.toThrow('open');
    clock.advance(1);
    await expect(cb.execute(async () => 'trial')).resolves.toBe('trial');
    expect(hooks.halfOpens).toBe(1);
    expect(hooks.resets).toBe(1);
    expect(cb.state).toBe(CircuitState.Closed);
  });

  it('opens again when the trial fails with a counted error', async () => {
    const clock = new FixedClock();
    const hooks: Hooks = { breaks: [], halfOpens: 0, resets: 0 };
    const cb = breaker(clock, hooks, 1);
    await expect(cb.execute(counted)).rejects.toThrow();
    clock.advance(100);
    await expect(cb.execute(counted)).rejects.toThrow('counted');
    expect(cb.state).toBe(CircuitState.Open);
    expect(hooks.breaks).toHaveLength(2);
  });

  it('closes when the trial fails with an uncounted error', async () => {
    const clock = new FixedClock();
    const hooks: Hooks = { breaks: [], halfOpens: 0, resets: 0 };
    const cb = breaker(clock, hooks, 1);
    await expect(cb.execute(counted)).rejects.toThrow();
    clock.advance(100);
    await expect(cb.execute(uncounted)).rejects.toThrow('other');
    expect(cb.state).toBe(CircuitState.Closed);
    expect(hooks.resets).toBe(1);
  });

  it('lets a single trial run and rejects the others while it is in flight', async () => {
    const clock = new FixedClock();
    const hooks: Hooks = { breaks: [], halfOpens: 0, resets: 0 };
    const cb = breaker(clock, hooks, 1);
    await expect(cb.execute(counted)).rejects.toThrow();
    clock.advance(100);
    const gate = new Deferred<string>();
    const trial = cb.execute(() => gate.promise);
    await expect(cb.execute(async () => 'second')).rejects.toThrow('open');
    gate.resolve('done');
    await expect(trial).resolves.toBe('done');
  });
});
