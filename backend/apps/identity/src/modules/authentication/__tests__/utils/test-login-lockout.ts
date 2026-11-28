import { Clock } from '@platform/kernel';
import { InMemoryRateLimiter, StrictRateLimiter } from '@platform/rate-limit';
import { EphemeralStore } from '../../../../ephemeral/ephemeral-store.js';
import { HmacSecretHasher } from '../../../../security/hmac-secret-hasher.js';
import { LockoutKeys } from '../../application/lockout-keys.js';
import { LoginLockout } from '../../application/login-lockout.js';
import { EphemeralLockoutStore } from '../../infrastructure/ephemeral-lockout-store.js';
import { RateLimiterAttemptCounters } from '../../infrastructure/rate-limiter-attempt-counters.js';

/**
 * The real lockout over in-memory doubles: counters in an `InMemoryRateLimiter` and lockouts in the
 * test `EphemeralStore`. Other modules count failures with the same rules.
 */
export class TestLoginLockout {
  readonly keys = new LockoutKeys(
    new HmacSecretHasher(['test', 'pepper'].join('-')),
  );
  readonly store: EphemeralLockoutStore;
  readonly lockout: LoginLockout;

  constructor(ephemeral: EphemeralStore, clock: Clock) {
    this.store = new EphemeralLockoutStore(ephemeral);
    this.lockout = new LoginLockout(
      new RateLimiterAttemptCounters(
        new StrictRateLimiter(new InMemoryRateLimiter({ clock })),
      ),
      this.store,
      this.keys,
    );
  }
}
