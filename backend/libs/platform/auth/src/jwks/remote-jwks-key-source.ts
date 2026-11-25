import type { KeyObject } from 'node:crypto';
import type { Clock } from '@platform/kernel';
import { JwksUnavailableError } from '../errors/jwks-unavailable.error.js';
import type { JwksFetcher } from './jwks-fetcher.js';
import { JwksKeySource } from './jwks-key-source.js';
import { JwkCodec } from './jwk-codec.js';

/**
 * Keys of the identity JWKS with a local cache. An unknown `kid` forces a
 * reload, but no more than one every `MIN_RELOAD_MS`, so a token with a made-up
 * `kid` does not turn every request into a download.
 */
export class RemoteJwksKeySource extends JwksKeySource {
  /** Lifetime of what was downloaded. */
  static readonly TTL_MS = 5 * 60_000;

  /** Minimum spacing between reloads triggered by an unknown `kid`. */
  static readonly MIN_RELOAD_MS = 30_000;

  private keys = new Map<string, KeyObject>();
  private loaded = false;
  private loadedAtMs = 0;
  private lastAttemptAtMs: number | undefined;
  private lastFailure: Error | undefined;
  private inFlight: Promise<void> | undefined;

  constructor(
    private readonly fetcher: JwksFetcher,
    private readonly clock: Clock,
  ) {
    super();
  }

  async keyFor(kid: string): Promise<KeyObject | undefined> {
    const nowMs = this.clock.now().getTime();
    if (!this.loaded) {
      if (
        this.lastFailure !== undefined &&
        this.lastAttemptAtMs !== undefined &&
        nowMs - this.lastAttemptAtMs < RemoteJwksKeySource.MIN_RELOAD_MS
      ) {
        throw this.lastFailure;
      }
      await this.reload(nowMs);
      return this.keys.get(kid);
    }
    const stale = nowMs - this.loadedAtMs >= RemoteJwksKeySource.TTL_MS;
    const unknownKid = !this.keys.has(kid);
    const cooledDown =
      this.lastAttemptAtMs === undefined ||
      nowMs - this.lastAttemptAtMs >= RemoteJwksKeySource.MIN_RELOAD_MS;
    if ((stale || unknownKid) && cooledDown) {
      try {
        await this.reload(nowMs);
      } catch {
        // If identity does not respond, the last download keeps being served: the cache covers the outage.
      }
    }
    return this.keys.get(kid);
  }

  /** Shares an in-flight download among concurrent calls. */
  private reload(nowMs: number): Promise<void> {
    if (this.inFlight !== undefined) {
      return this.inFlight;
    }
    this.inFlight = this.download(nowMs).finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  private async download(nowMs: number): Promise<void> {
    this.lastAttemptAtMs = nowMs;
    try {
      const body = await this.fetcher.fetch();
      if (!RemoteJwksKeySource.isRecord(body) || !Array.isArray(body.keys)) {
        throw new JwksUnavailableError('invalid JWKS');
      }
      const next = new Map<string, KeyObject>();
      for (const entry of body.keys) {
        if (!RemoteJwksKeySource.isRecord(entry)) {
          continue;
        }
        const kid = entry.kid;
        if (typeof kid !== 'string' || kid.length === 0) {
          continue;
        }
        try {
          next.set(kid, JwkCodec.publicKeyFromJwk(entry));
        } catch {
          // An invalid key must not keep the other keys of the same JWKS from being served.
        }
      }
      this.keys = next;
      this.loaded = true;
      this.loadedAtMs = nowMs;
      this.lastFailure = undefined;
    } catch (error) {
      this.lastFailure =
        error instanceof Error
          ? error
          : new JwksUnavailableError('request failed', error);
      throw this.lastFailure;
    }
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
