import {
  Inject,
  Injectable,
  Optional,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { Clock, ErrorDescriptor } from '@platform/kernel';
import { LoggerPort } from '@platform/observability';
import { RevokedSessionsRebuildJob } from '../jobs/revoked-sessions-rebuild-job.js';
import { AuthRevocationFeed } from '../state/auth-revocation-feed.js';
import { RevokedSessionRegistry } from '../state/revoked-session-registry.js';

/**
 * Gets the revoked sessions Bloom filter ready at startup. First it subscribes to the
 * notice channel, so no revocation is lost while it fills the filter, and
 * then it runs the rebuild job once, which leaves the registry filled. If the
 * rebuild fails, the registry stays cold and each query goes to Valkey until
 * the periodic job succeeds. It never throws: a Valkey that is down at startup
 * cannot bring the service down. It unsubscribes from the channel at shutdown.
 */
@Injectable()
export class AuthStateLifecycle
  implements OnApplicationBootstrap, OnModuleDestroy
{
  /** `runId` of the initial rebuild run. */
  static readonly BOOTSTRAP_RUN_ID = 'auth-bootstrap';

  private unsubscribe: (() => Promise<void>) | undefined;
  private abort: AbortController | undefined;

  constructor(
    private readonly registry: RevokedSessionRegistry,
    private readonly feed: AuthRevocationFeed,
    @Inject(RevokedSessionsRebuildJob)
    private readonly rebuild: RevokedSessionsRebuildJob,
    private readonly clock: Clock,
    @Optional() private readonly logger?: LoggerPort,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      this.unsubscribe = await this.feed.subscribe((sessionId) => {
        this.registry.add(sessionId).catch((error: unknown) =>
          this.logger?.error('revoked session not added to the filter', {
            error: ErrorDescriptor.describe(error),
          }),
        );
      });
    } catch (error) {
      this.logger?.warn('revocation feed unavailable', {
        error: ErrorDescriptor.describe(error),
      });
    }

    this.abort = new AbortController();
    try {
      await this.rebuild.run({
        signal: this.abort.signal,
        startedAt: this.clock.now(),
        runId: AuthStateLifecycle.BOOTSTRAP_RUN_ID,
      });
    } catch (error) {
      this.logger?.warn(
        'revoked sessions filter not ready, checks go to Valkey',
        {
          error: ErrorDescriptor.describe(error),
        },
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.abort?.abort();
    this.abort = undefined;
    const unsubscribe = this.unsubscribe;
    this.unsubscribe = undefined;
    if (unsubscribe !== undefined) {
      try {
        await unsubscribe();
      } catch (error) {
        this.logger?.warn('revocation feed not closed', {
          error: ErrorDescriptor.describe(error),
        });
      }
    }
  }
}
