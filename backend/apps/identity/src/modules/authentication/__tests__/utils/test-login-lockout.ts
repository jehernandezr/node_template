import { Clock } from '@platform/kernel';
import { InMemoryRateLimiter } from '@platform/rate-limit';
import { EphemeralStore } from '../../../../ephemeral/ephemeral-store.js';
import { HmacSecretHasher } from '../../../../security/hmac-secret-hasher.js';
import { LockoutKeys } from '../../application/lockout-keys.js';
import { LoginLockout } from '../../application/login-lockout.js';
import { EphemeralLockoutStore } from '../../infrastructure/ephemeral-lockout-store.js';
import { RateLimiterAttemptCounters } from '../../infrastructure/rate-limiter-attempt-counters.js';

/**
 * El bloqueo real sobre dobles en memoria: contadores en un `InMemoryRateLimiter` y bloqueos en el
 * `EphemeralStore` de la prueba. Otros módulos cuentan fallos con las mismas reglas.
 */
export class TestLoginLockout {
  readonly keys = new LockoutKeys(
    new HmacSecretHasher(['pimienta', 'prueba'].join('-')),
  );
  readonly store: EphemeralLockoutStore;
  readonly lockout: LoginLockout;

  constructor(ephemeral: EphemeralStore, clock: Clock) {
    this.store = new EphemeralLockoutStore(ephemeral);
    this.lockout = new LoginLockout(
      new RateLimiterAttemptCounters(new InMemoryRateLimiter({ clock })),
      this.store,
      this.keys,
    );
  }
}
