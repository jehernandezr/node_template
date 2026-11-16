import { Injectable } from '@nestjs/common';
import { TypeOrmDirectoryStore } from '@platform/adapters-postgres';
import { TenantVerifier } from '@platform/messaging';

/** Acepta solo los tenants que el directorio conoce: un sobre de otro tenant se rechaza. */
@Injectable()
export class SmokeTenantVerifier extends TenantVerifier {
  constructor(private readonly directory: TypeOrmDirectoryStore) {
    super();
  }

  async verify(tenantId: string | undefined): Promise<boolean> {
    if (tenantId === undefined) {
      return false;
    }
    return (await this.directory.getPlacement(tenantId)) !== undefined;
  }
}
