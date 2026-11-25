import { UserStatus } from '@contracts/identity';
import { TestShardScopes } from '../../../../__tests__/utils/index.js';
import { InMemoryUsersFacade } from '../../../users/__tests__/utils/index.js';
import { InMemoryTenantAccessRepository } from '../../__tests__/utils/index.js';
import type { Membership } from '../../domain/membership.js';
import { ListMembers } from '../list-members.use-case.js';

/** Tenant access that refuses to load every membership: a page must read only its own rows. */
class PageOnlyTenantAccess extends InMemoryTenantAccessRepository {
  override listMemberships(): Promise<readonly Membership[]> {
    throw new Error('A page must not load every membership of the tenant');
  }
}

const TENANT = '01930000-0000-7000-8000-0000000000aa';
const USER_IDS = [
  '01930000-0000-7000-8000-000000000003',
  '01930000-0000-7000-8000-000000000001',
  '01930000-0000-7000-8000-000000000002',
];

describe('ListMembers', () => {
  const tenantAccess = new PageOnlyTenantAccess();
  const users = new InMemoryUsersFacade();
  const listing = new ListMembers(
    tenantAccess,
    users,
    TestShardScopes.create(),
  );

  beforeAll(async () => {
    for (const userId of USER_IDS) {
      users.add({
        id: userId,
        homeTenantId: TENANT,
        email: `member.${userId.slice(-1)}@example.com`,
        status: UserStatus.Active,
        displayName: `Member ${userId.slice(-1)}`,
        locale: 'en',
      });
      await tenantAccess.insertMembership({
        id: userId,
        tenantId: TENANT,
        userId,
        homeTenantId: TENANT,
        groupIds: [],
        permissionVersion: 1,
        joinedAt: new Date('2026-11-01T00:00:00.000Z'),
        leavingSince: null,
      });
    }
  });

  describe('the first page', () => {
    it('returns the lowest user ids and points the cursor at the last one', async () => {
      const page = await listing.execute(TENANT, { limit: 2 });

      expect(page).toEqual({
        items: [
          expect.objectContaining({
            userId: USER_IDS[1],
            email: 'member.1@example.com',
          }),
          expect.objectContaining({ userId: USER_IDS[2] }),
        ],
        nextCursor: USER_IDS[2],
      });
    });
  });

  describe('the last page', () => {
    it('returns the members after the cursor without a next cursor', async () => {
      const page = await listing.execute(TENANT, {
        limit: 2,
        after: USER_IDS[2],
      });

      expect(page).toEqual({
        items: [expect.objectContaining({ userId: USER_IDS[0] })],
        nextCursor: null,
      });
    });
  });

  describe('a cursor that is not a user id', () => {
    it('returns an empty page', async () => {
      const page = await listing.execute(TENANT, { after: 'bm90LWEtdXNlcg' });

      expect(page).toEqual({ items: [], nextCursor: null });
    });
  });
});
