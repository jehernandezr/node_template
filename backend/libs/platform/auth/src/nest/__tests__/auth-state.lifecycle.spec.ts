import { RevocationReason } from '@contracts/identity';
import { BloomFilter, InMemoryAsyncBloomFilter } from '@platform/bloom';
import { FixedClock } from '@platform/kernel/test-utils';
import { InMemoryAuthState } from '../../__tests__/utils/in-memory-auth-state.js';
import { LoggerPort } from '@platform/observability';
import { RevokedSessionsRebuildJob } from '../../jobs/revoked-sessions-rebuild-job.js';
import { RevokedSessionRegistry } from '../../state/revoked-session-registry.js';
import { AuthStateLifecycle } from '../auth-state.lifecycle.js';

const START = new Date('2026-01-15T12:00:00.000Z');

/** Logger que guarda los avisos para comprobar que se emiten. */
class RecordingLogger extends LoggerPort {
  readonly warnings: string[] = [];

  debug(): void {
    return undefined;
  }

  info(): void {
    return undefined;
  }

  warn(message: string): void {
    this.warnings.push(message);
  }

  error(): void {
    return undefined;
  }

  child(): LoggerPort {
    return this;
  }
}

/** Deja que las continuaciones pendientes de los avisos terminen. */
const flush = (): Promise<void> =>
  new Promise<void>((resolve) => setImmediate(resolve));

describe('AuthStateLifecycle', () => {
  let feedState: InMemoryAuthState;
  let sourceState: InMemoryAuthState;
  let registry: RevokedSessionRegistry;
  let lifecycle: AuthStateLifecycle;
  let logger: RecordingLogger;

  beforeEach(() => {
    feedState = new InMemoryAuthState();
    sourceState = new InMemoryAuthState();
    registry = new RevokedSessionRegistry(
      new InMemoryAsyncBloomFilter(BloomFilter.create({ expectedItems: 1000 })),
    );
    const job = new RevokedSessionsRebuildJob(sourceState, registry);
    logger = new RecordingLogger();
    lifecycle = new AuthStateLifecycle(
      registry,
      feedState,
      job,
      new FixedClock(START),
      logger,
    );
  });

  describe('bootstrap', () => {
    it('warms the registry with the sessions revoked before the start', async () => {
      await sourceState.revokeSession('s-old', 60_000, RevocationReason.Logout);

      await lifecycle.onApplicationBootstrap();

      expect(registry.isWarm()).toBe(true);
      expect(await registry.mightContain('s-old')).toBe(true);
      expect(sourceState.count('revokedSessionIds')).toBe(1);
    });

    it('adds a revocation published after the start', async () => {
      await lifecycle.onApplicationBootstrap();

      await feedState.revokeSession('s-new', 60_000, RevocationReason.Logout);
      await flush();

      expect(await registry.mightContain('s-new')).toBe(true);
    });

    it('resolves and leaves the registry cold when the rebuild fails', async () => {
      sourceState.failure = new Error('down');

      await expect(lifecycle.onApplicationBootstrap()).resolves.toBeUndefined();

      expect(registry.isWarm()).toBe(false);
      expect(logger.warnings).toEqual([
        'revoked sessions filter not ready, checks go to Valkey',
      ]);
    });

    it('resolves and still warms the registry when the feed is down', async () => {
      feedState.failure = new Error('down');

      await expect(lifecycle.onApplicationBootstrap()).resolves.toBeUndefined();

      expect(registry.isWarm()).toBe(true);
      expect(logger.warnings).toEqual(['revocation feed unavailable']);
    });
  });

  describe('shutdown', () => {
    it('stops receiving revocations after the module is destroyed', async () => {
      await lifecycle.onApplicationBootstrap();
      await lifecycle.onModuleDestroy();

      await feedState.revokeSession('s-late', 60_000, RevocationReason.Logout);
      await flush();

      expect(await registry.mightContain('s-late')).toBe(false);
    });

    it('resolves when destroyed without a previous bootstrap', async () => {
      await expect(lifecycle.onModuleDestroy()).resolves.toBeUndefined();
    });
  });
});
