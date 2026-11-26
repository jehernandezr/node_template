import { TokenAudience } from '@contracts/identity';
import {
  UuidV7IdGenerator,
  SystemClock,
  SystemRandomSource,
} from '@platform/kernel';
import { ActorType } from '@platform/observability';
import type { ServiceAccountActor, UserActor } from '../../actor/actor.js';

/** Authenticated actors of a tenant for the guard and interceptor tests, with new ids. */
export class TestActors {
  private static readonly ids = new UuidV7IdGenerator(
    new SystemClock(),
    new SystemRandomSource(),
  );

  static serviceAccount(tenantId: string): ServiceAccountActor {
    return {
      kind: ActorType.ServiceAccount,
      serviceAccountId: TestActors.nextId(),
      apiKeyId: TestActors.nextId(),
      tenantId,
      permissions: [],
    };
  }

  static user(tenantId: string): UserActor {
    return {
      kind: ActorType.User,
      userId: TestActors.nextId(),
      tenantId,
      homeTenantId: tenantId,
      sessionId: TestActors.nextId(),
      audience: TokenAudience.Api,
      authMethods: [],
      authTime: 0,
      roles: [],
      platformRoles: [],
      permissionVersion: '1.1',
      region: 'us-east-1',
      sessionExpiresAt: 0,
      tokenId: TestActors.nextId(),
    };
  }

  private static nextId(): string {
    return TestActors.ids.next().toString();
  }
}
