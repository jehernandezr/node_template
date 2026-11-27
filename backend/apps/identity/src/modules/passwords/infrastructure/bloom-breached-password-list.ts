import { Inject, Injectable } from '@nestjs/common';
import { AsyncBloomFilter } from '@platform/bloom';
import { bloomFilterToken } from '@platform/bloom/nest';
import { BloomFilterName } from '../../../shared/enums/bloom-filter-name.enum.js';
import { BreachedPasswordList } from '../domain/breached-password-list.js';
import { KnownBreachedPasswordsSource } from './known-breached-passwords-source.js';

/**
 * Breached passwords in the Bloom `BloomFilterName.BreachedPasswords` (Valkey in the environments, memory in
 * the tests). The platform job rebuilds it with its cron; the first query of each process
 * loads it in case it has not run yet, and adding what was already there does not change a Bloom. When the
 * filter cannot be read or loaded, as with Valkey down, it answers from the source list itself, so a breached
 * password is still refused and the next query tries the filter again.
 */
@Injectable()
export class BloomBreachedPasswordList extends BreachedPasswordList {
  private loading: Promise<void> | undefined;
  private passwords: ReadonlySet<string> | undefined;

  constructor(
    @Inject(bloomFilterToken(BloomFilterName.BreachedPasswords))
    private readonly filter: AsyncBloomFilter,
    private readonly source: KnownBreachedPasswordsSource,
  ) {
    super();
  }

  override async contains(password: string): Promise<boolean> {
    const normalized = KnownBreachedPasswordsSource.normalize(password);
    try {
      await this.loaded();
      return await this.filter.mightContain(normalized);
    } catch {
      return this.known().has(normalized);
    }
  }

  private known(): ReadonlySet<string> {
    this.passwords ??= new Set(this.source.passwords());
    return this.passwords;
  }

  private loaded(): Promise<void> {
    this.loading ??= this.load().catch((error: unknown) => {
      this.loading = undefined;
      throw error;
    });
    return this.loading;
  }

  private async load(): Promise<void> {
    for (const batch of this.source.batches() as Iterable<readonly string[]>) {
      await this.filter.addMany(batch);
    }
  }
}
