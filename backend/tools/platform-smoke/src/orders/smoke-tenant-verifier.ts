import { Injectable } from '@nestjs/common';
import { TypeOrmDirectoryStore } from '@platform/adapters-postgres';
import { TenantVerifier } from '@platform/messaging';

/** Accepts only the tenants the directory knows: an envelope from another tenant is rejected. */
@Injectable()
export class SmokeTenantVerifier extends TenantVerifier {
  constructor(private readonly directory: TypeOrmDirectoryStore) {
    super();
  }

  override async verify(tenantId: string | undefined): Promise<boolean> {
    if (tenantId === undefined) {
      return false;
    }
    return (await this.directory.getPlacement(tenantId)) !== undefined;
  }
}
