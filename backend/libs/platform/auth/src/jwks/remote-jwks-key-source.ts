import type { KeyObject } from 'node:crypto';
import type { Clock } from '@platform/kernel';
import { JwksUnavailableError } from '../errors/jwks-unavailable.error.js';
import type { JwksFetcher } from './jwks-fetcher.js';
import { JwksKeySource } from './jwks-key-source.js';
import { JwkCodec } from './jwk-codec.js';

/**
 * Claves del JWKS de identity con caché local. Un `kid` desconocido fuerza una
 * recarga, pero no más de una cada `MIN_RELOAD_MS`, así un token con un `kid`
 * inventado no convierte cada petición en una descarga.
 */
export class RemoteJwksKeySource extends JwksKeySource {
  /** Vida de lo descargado. */
  static readonly TTL_MS = 5 * 60_000;

  /** Separación mínima entre recargas provocadas por un `kid` desconocido. */
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
        // Si identity no responde se sigue sirviendo lo último descargado: la caché cubre el corte.
      }
    }
    return this.keys.get(kid);
  }

  /** Comparte una descarga en curso entre las llamadas concurrentes. */
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
          // Una clave inválida no debe impedir que sirvan las demás del mismo JWKS.
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
