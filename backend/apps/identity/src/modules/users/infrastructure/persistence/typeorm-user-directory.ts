import { Injectable } from '@nestjs/common';
import { CatalogDataSource } from '@platform/persistence';
import { LessThan } from 'typeorm';
import { CatalogTableRepository } from '../../../../database/catalog-table-repository.js';
import { LookupStatus } from '../../domain/lookup-status.enum.js';
import { UserDirectory } from '../../domain/user-directory.js';
import type { UserLookup } from '../../domain/user-lookup.js';
import { IdentityLookupEntity } from './entities/identity-lookup.entity.js';

/** `UserDirectory` over `identity_lookup` of the catalog. The email fingerprint is its primary key. */
@Injectable()
export class TypeOrmUserDirectory
  extends CatalogTableRepository
  implements UserDirectory
{
  constructor(catalog: CatalogDataSource) {
    super(catalog);
  }

  async reserve(lookup: UserLookup): Promise<boolean> {
    const inserted: unknown[] = await this.write((manager) =>
      manager.query(
        'INSERT INTO "identity_lookup" ("email_fingerprint", "user_id", "home_tenant_id", "region", "status", "created_at") ' +
          'VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING RETURNING "user_id"',
        [
          lookup.emailFingerprint,
          lookup.userId,
          lookup.homeTenantId,
          lookup.region,
          lookup.status,
          lookup.createdAt,
        ],
      ),
    );
    return inserted.length > 0;
  }

  async activate(fingerprint: Buffer): Promise<void> {
    await this.write((manager) =>
      manager.update(
        IdentityLookupEntity,
        { emailFingerprint: fingerprint },
        { status: LookupStatus.Active },
      ),
    );
  }

  async forget(userId: string): Promise<void> {
    await this.write((manager) =>
      manager.delete(IdentityLookupEntity, { userId }),
    );
  }

  async release(fingerprint: Buffer, userId: string): Promise<void> {
    await this.write((manager) =>
      manager.delete(IdentityLookupEntity, {
        emailFingerprint: fingerprint,
        userId,
        status: LookupStatus.Reserved,
      }),
    );
  }

  async findByFingerprint(
    fingerprint: Buffer,
  ): Promise<UserLookup | undefined> {
    const row = await this.read((manager) =>
      manager.findOneBy(IdentityLookupEntity, {
        emailFingerprint: fingerprint,
      }),
    );
    return row === null ? undefined : this.toLookup(row);
  }

  async findByUserId(userId: string): Promise<UserLookup | undefined> {
    const row = await this.read((manager) =>
      manager.findOneBy(IdentityLookupEntity, { userId }),
    );
    return row === null ? undefined : this.toLookup(row);
  }

  async moveEmail(userId: string, from: Buffer, to: Buffer): Promise<boolean> {
    return this.write(async (manager) => {
      const taken = await manager.findOneBy(IdentityLookupEntity, {
        emailFingerprint: to,
      });
      if (taken !== null) {
        return false;
      }
      const moved = await manager.update(
        IdentityLookupEntity,
        { emailFingerprint: from, userId },
        { emailFingerprint: to },
      );
      return moved.affected === 1;
    });
  }

  async sweepReserved(before: Date): Promise<number> {
    const result = await this.write((manager) =>
      manager.delete(IdentityLookupEntity, {
        status: LookupStatus.Reserved,
        createdAt: LessThan(before),
      }),
    );
    return result.affected ?? 0;
  }

  private toLookup(row: IdentityLookupEntity): UserLookup {
    return {
      emailFingerprint: row.emailFingerprint,
      userId: row.userId,
      homeTenantId: row.homeTenantId,
      region: row.region,
      status: row.status as LookupStatus,
      createdAt: row.createdAt,
    };
  }

  async relocateHomeTenant(
    homeTenantId: string,
    region: string,
  ): Promise<void> {
    await this.write((manager) =>
      manager.update(IdentityLookupEntity, { homeTenantId }, { region }),
    );
  }
}
