import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CatalogDataSource } from '@platform/persistence';
import { CatalogTableRepository } from '../../../../database/catalog-table-repository.js';
import type { UserRef } from '../../../../shared/types/user-ref.type.js';
import { PasskeyDirectory } from '../../domain/passkey-store.js';
import { PasskeyLookupEntity } from './entities/passkey-lookup.entity.js';

/** `PasskeyDirectory` over `passkey_lookup` in the catalog, under the SHA-256 of the credential id. */
@Injectable()
export class TypeOrmPasskeyDirectory
  extends CatalogTableRepository
  implements PasskeyDirectory
{
  constructor(catalog: CatalogDataSource) {
    super(catalog);
  }

  async register(
    credentialId: string,
    user: UserRef,
    region: string,
  ): Promise<void> {
    await this.write((manager) =>
      manager.insert(PasskeyLookupEntity, {
        credentialIdHash: this.hashOf(credentialId),
        userId: user.userId,
        homeTenantId: user.homeTenantId,
        region,
      }),
    );
  }

  async ownerOf(credentialId: string): Promise<UserRef | undefined> {
    const row = await this.read((manager) =>
      manager.findOneBy(PasskeyLookupEntity, {
        credentialIdHash: this.hashOf(credentialId),
      }),
    );
    return row === null
      ? undefined
      : { userId: row.userId, homeTenantId: row.homeTenantId };
  }

  async relocateHomeTenant(
    homeTenantId: string,
    region: string,
  ): Promise<void> {
    await this.write((manager) =>
      manager.update(PasskeyLookupEntity, { homeTenantId }, { region }),
    );
  }

  async remove(credentialId: string): Promise<void> {
    await this.write((manager) =>
      manager.delete(PasskeyLookupEntity, {
        credentialIdHash: this.hashOf(credentialId),
      }),
    );
  }

  private hashOf(credentialId: string): Buffer {
    return createHash('sha256').update(credentialId).digest();
  }
}
