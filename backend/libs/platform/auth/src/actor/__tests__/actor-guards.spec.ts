import { TokenAudience, AuthMethodReference } from '@contracts/identity';
import { ActorType } from '@platform/observability';
import type {
  Actor,
  ServiceAccountActor,
  SystemActor,
  UserActor,
} from '../actor.js';
import { ActorGuards } from '../actor-guards.js';

/** `jti` del access token de prueba. */
const JTI = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f05';

const user: UserActor = {
  kind: ActorType.User,
  userId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f01',
  tenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f02',
  homeTenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f02',
  sessionId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f04',
  audience: TokenAudience.Api,
  authMethods: [AuthMethodReference.Password],
  authTime: 1_700_000_000,
  roles: [],
  platformRoles: [],
  permissionVersion: '1.1',
  region: 'us',
  sessionExpiresAt: 1_700_028_800,
  tokenId: JTI,
};

const serviceAccount: ServiceAccountActor = {
  kind: ActorType.ServiceAccount,
  serviceAccountId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f07',
  apiKeyId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f08',
  tenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f02',
  permissions: [],
};

const system: SystemActor = { kind: ActorType.System, name: 'scheduler' };

describe('ActorGuards', () => {
  it.each<[string, Actor, boolean, boolean, boolean]>([
    ['a user', user, true, false, false],
    ['a service account', serviceAccount, false, true, false],
    ['the system', system, false, false, true],
  ])('recognises %s', (_name, actor, isUser, isServiceAccount, isSystem) => {
    expect(ActorGuards.isUser(actor)).toBe(isUser);
    expect(ActorGuards.isServiceAccount(actor)).toBe(isServiceAccount);
    expect(ActorGuards.isSystem(actor)).toBe(isSystem);
  });
});
