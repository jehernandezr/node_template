import { AuthMethodReference, TokenAudience } from '@contracts/identity';
import { PlatformErrorCode } from '@contracts/platform';
import { ActorType } from '@platform/observability';
import type { ServiceAccountActor, UserActor } from '../actor.js';
import { ActingMember } from '../acting-member.js';
import { ActingUser } from '../acting-user.js';

const USER_ID = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f01';
const ACTIVE_TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f02';
const HOME_TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f03';
const SERVICE_ACCOUNT_ID = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f07';

const user: UserActor = {
  kind: ActorType.User,
  userId: USER_ID,
  tenantId: ACTIVE_TENANT,
  homeTenantId: HOME_TENANT,
  sessionId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f04',
  audience: TokenAudience.Api,
  authMethods: [AuthMethodReference.Password],
  authTime: 1_700_000_000,
  roles: [],
  platformRoles: [],
  permissionVersion: '1.1',
  region: 'us',
  sessionExpiresAt: 1_700_028_800,
  tokenId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f05',
};

const serviceAccount: ServiceAccountActor = {
  kind: ActorType.ServiceAccount,
  serviceAccountId: SERVICE_ACCOUNT_ID,
  apiKeyId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f08',
  tenantId: ACTIVE_TENANT,
  permissions: [],
};

const unauthenticated = { code: PlatformErrorCode.AuthUnauthenticated };

describe('ActingMember', () => {
  it('takes the active tenant and the home tenant of a person', () => {
    const member = ActingMember.of(user);

    expect(member).toEqual({
      tenantId: ACTIVE_TENANT,
      ref: { userId: USER_ID, homeTenantId: HOME_TENANT },
      person: true,
    });
  });

  it('makes a service account the author with its own id and its key tenant as home', () => {
    const member = ActingMember.of(serviceAccount);

    expect(member).toEqual({
      tenantId: ACTIVE_TENANT,
      ref: { userId: SERVICE_ACCOUNT_ID, homeTenantId: ACTIVE_TENANT },
      person: false,
    });
  });

  it('rejects the system as unauthenticated', () => {
    expect(() =>
      ActingMember.of({ kind: ActorType.System, name: 'scheduler' }),
    ).toThrow(expect.objectContaining(unauthenticated));
  });

  it('rejects a route without an actor as unauthenticated', () => {
    expect(() => ActingMember.of(undefined)).toThrow(
      expect.objectContaining(unauthenticated),
    );
  });
});

describe('ActingUser', () => {
  it('returns the user actor of a session', () => {
    expect(ActingUser.of(user)).toBe(user);
  });

  it('gives the user and their home tenant, not the active one', () => {
    expect(ActingUser.refOf(user)).toEqual({
      userId: USER_ID,
      homeTenantId: HOME_TENANT,
    });
  });

  it('rejects a service account, which has no user session', () => {
    expect(() => ActingUser.refOf(serviceAccount)).toThrow(
      expect.objectContaining(unauthenticated),
    );
  });

  it('rejects a route without an actor', () => {
    expect(() => ActingUser.of(undefined)).toThrow(
      expect.objectContaining(unauthenticated),
    );
  });
});
