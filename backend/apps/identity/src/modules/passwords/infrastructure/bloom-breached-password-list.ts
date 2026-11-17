import { Inject, Injectable } from '@nestjs/common';
import { AsyncBloomFilter } from '@platform/bloom';
import { bloomFilterToken } from '@platform/bloom/nest';
import { BloomFilterName } from '../../../shared/enums/bloom-filter-name.enum.js';
import { BreachedPasswordList } from '../domain/breached-password-list.js';
import { KnownBreachedPasswordsSource } from './known-breached-passwords-source.js';

/**
 * Contraseñas filtradas en el Bloom `BloomFilterName.BreachedPasswords` (Valkey en los ambientes, memoria en
 * las pruebas). El job de la plataforma lo reconstruye con su cron; la primera consulta de cada proceso lo
 * carga por si todavía no corrió, y agregar lo que ya estaba no cambia un Bloom.
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
