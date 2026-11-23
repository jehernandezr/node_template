import { Injectable } from '@nestjs/common';
import type { UserRef } from '@contracts/platform';
import { ShardScope } from '@platform/persistence';
import { ShardKey } from '@platform/sharding';

/** Corre un bloque en el shard del usuario, que vive en el shard de su tenant de origen. */
@Injectable()
export class UserShard {
  constructor(private readonly scope: ShardScope) {}

  run<T>(user: UserRef, fn: () => Promise<T>): Promise<T> {
    return this.scope.run(
      {
        tenantId: user.homeTenantId,
        keyKind: ShardKey.User,
        keyValue: user.userId,
      },
      fn,
    );
  }
}
