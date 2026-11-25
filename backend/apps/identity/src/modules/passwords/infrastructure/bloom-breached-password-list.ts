import { Inject, Injectable } from '@nestjs/common';
import { AsyncBloomFilter } from '@platform/bloom';
import { bloomFilterToken } from '@platform/bloom/nest';
import { BloomFilterName } from '../../../shared/enums/bloom-filter-name.enum.js';
import { BreachedPasswordList } from '../domain/breached-password-list.js';
import { KnownBreachedPasswordsSource } from './known-breached-passwords-source.js';

/**
 * Breached passwords in the Bloom `BloomFilterName.BreachedPasswords` (Valkey in the environments, memory in
 * the tests). The platform job rebuilds it with its cron; the first query of each process
 * loads it in case it has not run yet, and adding what was already there does not change a Bloom.
 */
@Injectable()
export class BloomBreachedPasswordList extends BreachedPasswordList {
  private loading: Promise<void> | undefined;

  constructor(
    @Inject(bloomFilterToken(BloomFilterName.BreachedPasswords))
    private readonly filter: AsyncBloomFilter,
    private readonly source: KnownBreachedPasswordsSource,
  ) {
    super();
  }

  async contains(password: string): Promise<boolean> {
    await this.loaded();
    return this.filter.mightContain(
      KnownBreachedPasswordsSource.normalize(password),
    );
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
