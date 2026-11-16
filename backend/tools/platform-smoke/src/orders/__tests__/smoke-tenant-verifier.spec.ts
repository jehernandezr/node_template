import type { TypeOrmDirectoryStore } from '@platform/adapters-postgres';
import { SmokeTenantVerifier } from '../smoke-tenant-verifier.js';

const TENANT = '0193f1c2-0000-7000-8000-0000000000a1';

function verifierWith(known: readonly string[]): SmokeTenantVerifier {
  const directory = {
    getPlacement: (tenantId: string) =>
      Promise.resolve(
        known.includes(tenantId)
          ? { tenantId, shardGroup: ['shard'] }
          : undefined,
      ),
  } as unknown as TypeOrmDirectoryStore;
  return new SmokeTenantVerifier(directory);
}

describe('SmokeTenantVerifier', () => {
  it('accepts a tenant the directory places', async () => {
    await expect(verifierWith([TENANT]).verify(TENANT)).resolves.toBe(true);
  });

  it('rejects a tenant the directory does not know', async () => {
    await expect(verifierWith([]).verify(TENANT)).resolves.toBe(false);
  });

  it('rejects an envelope without tenant', async () => {
    await expect(verifierWith([TENANT]).verify(undefined)).resolves.toBe(false);
  });
});
