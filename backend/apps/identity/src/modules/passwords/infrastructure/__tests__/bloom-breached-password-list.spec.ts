import {
  AsyncBloomFilter,
  BloomDefinitionResolver,
  InMemoryBloomFilterFactory,
} from '@platform/bloom';
import { BloomFilterName } from '../../../../shared/enums/bloom-filter-name.enum.js';
import { BloomBreachedPasswordList } from '../bloom-breached-password-list.js';
import { KnownBreachedPasswordsSource } from '../known-breached-passwords-source.js';

/** Filtro que falla la primera carga, como un Valkey que no responde al arrancar. */
class FlakyFilter extends AsyncBloomFilter {
  private failures = 1;

  constructor(private readonly inner: AsyncBloomFilter) {
    super();
  }

  add(item: string): Promise<void> {
    return this.inner.add(item);
  }

  async addMany(items: readonly string[]): Promise<void> {
    if (this.failures > 0) {
      this.failures -= 1;
      throw new Error('valkey no responde');
    }
    await this.inner.addMany(items);
  }

  mightContain(item: string): Promise<boolean> {
    return this.inner.mightContain(item);
  }
}

describe('BloomBreachedPasswordList', () => {
  const filter = () =>
    new InMemoryBloomFilterFactory().create(
      BloomDefinitionResolver.resolve({
        name: BloomFilterName.BreachedPasswords,
        expectedItems: 10_000,
        falsePositiveRate: 0.001,
        rebuildCron: '0 4 * * 0',
      }),
    );

  it('seeds about a thousand common passwords of the minimum length or more', () => {
    const passwords = new KnownBreachedPasswordsSource().passwords();

    expect(passwords.length).toBeGreaterThanOrEqual(1_000);
    expect(passwords.every((password) => [...password].length >= 12)).toBe(
      true,
    );
    expect(passwords).toContain('password2024');
  });

  it('finds known passwords and their usual variants regardless of case', async () => {
    const list = new BloomBreachedPasswordList(
      filter(),
      new KnownBreachedPasswordsSource(),
    );

    await expect(list.contains('Password1234')).resolves.toBe(true);
    await expect(list.contains('Sunshine2024')).resolves.toBe(true);
    await expect(list.contains('una frase que nadie usa 2026')).resolves.toBe(
      false,
    );
  });

  it('tries to load again when the first load fails', async () => {
    const list = new BloomBreachedPasswordList(
      new FlakyFilter(filter()),
      new KnownBreachedPasswordsSource(),
    );

    await expect(list.contains('Password1234')).rejects.toThrow(
      'valkey no responde',
    );
    await expect(list.contains('Password1234')).resolves.toBe(true);
  });

  it('hands the rebuild job its items in batches', () => {
    const source = new KnownBreachedPasswordsSource();
    const batches = [...(source.batches() as Iterable<readonly string[]>)];

    expect(batches.flat()).toEqual(source.passwords());
  });
});
