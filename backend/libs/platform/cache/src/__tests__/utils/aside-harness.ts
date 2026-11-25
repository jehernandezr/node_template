import {
  FixedClock,
  FixedRandomSource,
  SequentialIdGenerator,
} from '@platform/kernel/test-utils';
import { SystemClock } from '@platform/kernel';
import { CacheAside } from '../../cache-aside.js';
import { CallerWait } from '../../caller-wait.js';
import { SingleFlight } from '../../single-flight.js';
import { TtlJitter } from '../../ttl-jitter.js';
import { VersionedKeyspace } from '../../versioned-keyspace.js';
import { FakeCachePort } from './fake-cache-port.js';
import { FakeResilience } from './fake-resilience.js';
import { FakeTransactionManager } from './fake-transaction-manager.js';
import { RecordingCacheErrorReporter } from './recording-cache-error-reporter.js';

/** `CacheAside` test doubles with a fixed clock, sequential tokens and non-random jitter. */
export class AsideHarness {
  readonly clock = new FixedClock();
  readonly cache = new FakeCachePort(this.clock);
  readonly resilience = new FakeResilience();
  readonly transactions = new FakeTransactionManager();
  readonly reporter = new RecordingCacheErrorReporter();
  private readonly wait = new CallerWait(new SystemClock());
  readonly keyspace = new VersionedKeyspace(this.cache, {
    ids: new SequentialIdGenerator(),
  });
  readonly aside = new CacheAside(
    this.cache,
    this.keyspace,
    {
      resilience: this.resilience,
      transactions: this.transactions,
      reporter: this.reporter,
    },
    {
      jitter: new TtlJitter(new FixedRandomSource([0.5])),
      wait: this.wait,
      singleFlight: new SingleFlight(this.wait),
    },
  );

  /** Lets background writes run: microtasks only, no timers. */
  async settle(): Promise<void> {
    for (let turn = 0; turn < 20; turn += 1) {
      await Promise.resolve();
    }
  }
}
