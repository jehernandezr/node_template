import type { Clock } from '@platform/kernel';
import { EphemeralStore } from '../../ephemeral/ephemeral-store.js';

interface Entry {
  readonly value: string;
  readonly expiresAt: number;
}

interface FieldsEntry {
  readonly fields: Map<string, string>;
  expiresAt: number;
}

/** In-memory `EphemeralStore` with the test clock: keys expire when the clock advances. */
export class InMemoryEphemeralStore extends EphemeralStore {
  private readonly entries = new Map<string, Entry>();
  private readonly maps = new Map<string, FieldsEntry>();

  constructor(private readonly clock: Clock) {
    super();
  }

  override async get(key: string): Promise<string | undefined> {
    return this.live(key)?.value;
  }

  override async set(key: string, value: string, ttlMs: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
  }

  override async setIfAbsent(
    key: string,
    value: string,
    ttlMs: number,
  ): Promise<boolean> {
    if (this.live(key) !== undefined) {
      return false;
    }
    await this.set(key, value, ttlMs);
    return true;
  }

  override async take(key: string): Promise<string | undefined> {
    const entry = this.live(key);
    this.entries.delete(key);
    return entry?.value;
  }

  override async delete(key: string): Promise<void> {
    this.entries.delete(key);
  }

  override async increment(key: string, ttlMs: number): Promise<number> {
    const entry = this.live(key);
    const next = Number(entry?.value ?? '0') + 1;
    this.entries.set(key, {
      value: String(next),
      expiresAt: entry?.expiresAt ?? this.now() + ttlMs,
    });
    return next;
  }

  override async extend(key: string, ttlMs: number): Promise<void> {
    const entry = this.live(key);
    if (entry !== undefined) {
      this.entries.set(key, {
        value: entry.value,
        expiresAt: Math.max(entry.expiresAt, this.now() + ttlMs),
      });
    }
  }

  override async remainingMs(key: string): Promise<number | undefined> {
    const entry = this.live(key);
    return entry === undefined ? undefined : entry.expiresAt - this.now();
  }

  override async putField(
    key: string,
    field: string,
    value: string,
    ttlMs: number,
  ): Promise<void> {
    const existing = this.maps.get(key);
    const entry =
      existing === undefined || existing.expiresAt <= this.now()
        ? { fields: new Map<string, string>(), expiresAt: 0 }
        : existing;
    entry.fields.set(field, value);
    entry.expiresAt = this.now() + ttlMs;
    this.maps.set(key, entry);
  }

  override async takeFields(key: string): Promise<ReadonlyMap<string, string>> {
    const entry = this.maps.get(key);
    this.maps.delete(key);
    return entry === undefined || entry.expiresAt <= this.now()
      ? new Map()
      : entry.fields;
  }

  /** Live keys, so a test can check what was stored. */
  keys(): string[] {
    return [...this.entries.keys()].filter((key) => this.live(key));
  }

  private live(key: string): Entry | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined || entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  private now(): number {
    return this.clock.now().getTime();
  }
}
