import { FixedClock } from '@platform/kernel/test-utils';
import { AuthErrorCode } from '../../errors/auth-error-code.enum.js';
import { JwksUnavailableError } from '../../errors/jwks-unavailable.error.js';
import { TestKeyPair } from '../../__tests__/utils/test-key-pair.js';
import { RemoteJwksKeySource } from '../remote-jwks-key-source.js';
import { ScriptedJwksFetcher } from './utils/scripted-jwks-fetcher.js';

const SECOND = 1_000;
const MINUTE = 60 * SECOND;

const startAt = (): FixedClock =>
  new FixedClock(new Date('2026-01-15T12:00:00.000Z'));

describe('RemoteJwksKeySource', () => {
  const pair = TestKeyPair.generate('k1');
  const other = TestKeyPair.generate('k2');

  describe('caching', () => {
    it('downloads once and returns the key on the first call', async () => {
      const fetcher = new ScriptedJwksFetcher({ keys: [pair.jwk()] });
      const source = new RemoteJwksKeySource(fetcher, startAt());

      const key = await source.keyFor('k1');

      expect(key?.export({ format: 'jwk' }).x).toBe(pair.jwk().x);
      expect(fetcher.fetchCount).toBe(1);
    });

    it('does not download again within five minutes', async () => {
      const fetcher = new ScriptedJwksFetcher({ keys: [pair.jwk()] });
      const clock = startAt();
      const source = new RemoteJwksKeySource(fetcher, clock);
      await source.keyFor('k1');

      clock.advance(4 * MINUTE);
      await source.keyFor('k1');

      expect(fetcher.fetchCount).toBe(1);
    });

    it('reloads after an unknown kid once thirty seconds have passed', async () => {
      const fetcher = new ScriptedJwksFetcher(
        { keys: [pair.jwk()] },
        { keys: [pair.jwk(), other.jwk()] },
      );
      const clock = startAt();
      const source = new RemoteJwksKeySource(fetcher, clock);
      await source.keyFor('k1');

      clock.advance(30 * SECOND);
      await source.keyFor('k2');

      expect(fetcher.fetchCount).toBe(2);
    });

    it('does not reload for a second unknown kid within thirty seconds', async () => {
      const fetcher = new ScriptedJwksFetcher({ keys: [pair.jwk()] });
      const clock = startAt();
      const source = new RemoteJwksKeySource(fetcher, clock);
      await source.keyFor('k1');
      clock.advance(30 * SECOND);
      await source.keyFor('unknown-1');

      clock.advance(29 * SECOND);
      const key = await source.keyFor('unknown-2');

      expect(key).toBeUndefined();
      expect(fetcher.fetchCount).toBe(2);
    });

    it('reloads after five minutes even when the kid is known', async () => {
      const fetcher = new ScriptedJwksFetcher(
        { keys: [pair.jwk()] },
        { keys: [pair.jwk()] },
      );
      const clock = startAt();
      const source = new RemoteJwksKeySource(fetcher, clock);
      await source.keyFor('k1');

      clock.advance(5 * MINUTE);
      await source.keyFor('k1');

      expect(fetcher.fetchCount).toBe(2);
    });

    it('shares one download between concurrent calls', async () => {
      const fetcher = new ScriptedJwksFetcher({ keys: [pair.jwk()] });
      const source = new RemoteJwksKeySource(fetcher, startAt());
      fetcher.hold();

      const pending = Promise.all(
        Array.from({ length: 10 }, () => source.keyFor('k1')),
      );
      fetcher.release();
      const keys = await pending;

      expect(keys.every((key) => key !== undefined)).toBe(true);
      expect(fetcher.fetchCount).toBe(1);
    });
  });

  describe('rotation and failures', () => {
    it('stops serving a rotated-out key after the next download', async () => {
      const fetcher = new ScriptedJwksFetcher(
        { keys: [pair.jwk()] },
        { keys: [other.jwk()] },
      );
      const clock = startAt();
      const source = new RemoteJwksKeySource(fetcher, clock);
      await source.keyFor('k1');

      clock.advance(5 * MINUTE);
      const rotated = await source.keyFor('k1');

      expect(rotated).toBeUndefined();
    });

    it('keeps serving a known key when a reload fails', async () => {
      const fetcher = new ScriptedJwksFetcher(
        { keys: [pair.jwk()] },
        new JwksUnavailableError('down'),
      );
      const clock = startAt();
      const source = new RemoteJwksKeySource(fetcher, clock);
      await source.keyFor('k1');

      clock.advance(5 * MINUTE);

      await expect(source.keyFor('k1')).resolves.toBeDefined();
    });

    it('throws JWKS_UNAVAILABLE without a cache and skips retries for thirty seconds', async () => {
      const fetcher = new ScriptedJwksFetcher(new JwksUnavailableError('down'));
      const source = new RemoteJwksKeySource(fetcher, startAt());
      await expect(source.keyFor('k1')).rejects.toMatchObject({
        code: AuthErrorCode.JwksUnavailable,
      });

      await expect(source.keyFor('k1')).rejects.toMatchObject({
        code: AuthErrorCode.JwksUnavailable,
      });

      expect(fetcher.fetchCount).toBe(1);
    });

    it('tries again after thirty seconds without a cache', async () => {
      const fetcher = new ScriptedJwksFetcher(
        new JwksUnavailableError('down'),
        { keys: [pair.jwk()] },
      );
      const clock = startAt();
      const source = new RemoteJwksKeySource(fetcher, clock);
      await expect(source.keyFor('k1')).rejects.toThrow();

      clock.advance(30 * SECOND);

      await expect(source.keyFor('k1')).resolves.toBeDefined();
      expect(fetcher.fetchCount).toBe(2);
    });

    it('skips malformed keys and keeps the valid ones', async () => {
      const fetcher = new ScriptedJwksFetcher({
        keys: [
          { kty: 'EC', crv: 'P-256', kid: 'broken', x: 'short', y: 'short' },
          { kty: 'EC', crv: 'P-256', x: 'A'.repeat(43), y: 'A'.repeat(43) },
          pair.jwk(),
        ],
      });
      const source = new RemoteJwksKeySource(fetcher, startAt());

      await expect(source.keyFor('broken')).resolves.toBeUndefined();
      await expect(source.keyFor('k1')).resolves.toBeDefined();
    });

    it('throws JWKS_UNAVAILABLE when the body has no keys array', async () => {
      const fetcher = new ScriptedJwksFetcher({ jwks: [] });
      const source = new RemoteJwksKeySource(fetcher, startAt());

      await expect(source.keyFor('k1')).rejects.toMatchObject({
        code: AuthErrorCode.JwksUnavailable,
      });
    });
  });
});
