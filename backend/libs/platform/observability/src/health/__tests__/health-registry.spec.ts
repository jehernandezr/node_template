import { GuardViolationError, HealthState } from '@platform/kernel';
import { ObservabilityErrorCode } from '../../errors/observability-error-code.enum.js';
import { HealthRegistry } from '../health-registry.js';
import { FailingHealthCheck } from './utils/failing-health-check.js';
import { HangingHealthCheck } from './utils/hanging-health-check.js';
import { SignalRecordingHealthCheck } from './utils/signal-recording-health-check.js';
import { StaticHealthCheck } from './utils/static-health-check.js';

describe('HealthRegistry', () => {
  describe('checkAll', () => {
    it('reports Up with no checks', async () => {
      await expect(new HealthRegistry().checkAll()).resolves.toEqual({
        state: HealthState.Up,
        checks: {},
      });
    });

    it.each([
      ['every check is up', [HealthState.Up, HealthState.Up], HealthState.Up],
      [
        'one check is degraded',
        [HealthState.Up, HealthState.Degraded],
        HealthState.Degraded,
      ],
      [
        'one check is down',
        [HealthState.Degraded, HealthState.Down],
        HealthState.Down,
      ],
    ])('reports the worst state when %s', async (_label, states, expected) => {
      const registry = new HealthRegistry();
      states.forEach((state, index) => {
        registry.register(
          new StaticHealthCheck(`dependency-${index}`, { state }),
        );
      });

      expect((await registry.checkAll()).state).toBe(expected);
    });

    it('reports each dependency by its name', async () => {
      const registry = new HealthRegistry();
      registry.register(
        new StaticHealthCheck('database', { state: HealthState.Up }),
      );
      registry.register(
        new StaticHealthCheck('cache', {
          state: HealthState.Degraded,
          detail: 'slow',
        }),
      );

      expect(await registry.checkAll()).toEqual({
        state: HealthState.Degraded,
        checks: {
          database: { state: HealthState.Up },
          cache: { state: HealthState.Degraded, detail: 'slow' },
        },
      });
    });

    it('reports Down with the error name when a check throws', async () => {
      const registry = new HealthRegistry();
      registry.register(
        new FailingHealthCheck('database', new Error('db password is hunter2')),
      );

      const summary = await registry.checkAll();

      expect(summary.state).toBe(HealthState.Down);
      expect(summary.checks['database']).toEqual({
        state: HealthState.Down,
        detail: 'Error',
      });
      expect(JSON.stringify(summary)).not.toContain('hunter2');
    });

    it('reports Down with TimeoutError when a check never answers', async () => {
      const registry = new HealthRegistry(10);
      registry.register(new HangingHealthCheck('queue'));

      expect(await registry.checkAll()).toEqual({
        state: HealthState.Down,
        checks: { queue: { state: HealthState.Down, detail: 'TimeoutError' } },
      });
    });

    it('passes an aborted signal to the checks when the caller aborted before', async () => {
      const registry = new HealthRegistry();
      const recorder = new SignalRecordingHealthCheck('cache');
      registry.register(recorder);
      const controller = new AbortController();
      controller.abort();

      const summary = await registry.checkAll(controller.signal);

      expect(recorder.received?.aborted).toBe(true);
      expect(summary.checks['cache']).toEqual({
        state: HealthState.Down,
        detail: 'AbortError',
      });
    });
  });

  describe('register', () => {
    it('rejects a second check with the same name', () => {
      const registry = new HealthRegistry();
      registry.register(
        new StaticHealthCheck('database', { state: HealthState.Up }),
      );

      expect(() =>
        registry.register(
          new StaticHealthCheck('database', { state: HealthState.Up }),
        ),
      ).toThrow(
        expect.objectContaining({
          code: ObservabilityErrorCode.DuplicateHealthCheck,
        }),
      );
    });
  });

  describe('constructor', () => {
    it('rejects a timeout that is not a positive integer', () => {
      expect(() => new HealthRegistry(0)).toThrow(GuardViolationError);
    });
  });
});
