import type { Membership } from '../domain/membership.js';
import { InMemoryTenantAccessRepository } from './utils/index.js';

const TENANT = '018f0000-0000-7000-8000-0000000000aa';
const LOWER = '018f0000-0000-7000-8000-00000000000b';
const UPPER = '018F0000-0000-7000-8000-00000000000C';
const FIRST = '018f0000-0000-7000-8000-00000000000a';

const membershipOf = (userId: string): Membership => ({
  id: `membership-${userId}`,
  tenantId: TENANT,
  userId,
  homeTenantId: TENANT,
  groupIds: [],
  permissionVersion: 1,
  joinedAt: new Date('2026-11-25T10:00:00.000Z'),
  leavingSince: null,
});

describe('InMemoryTenantAccessRepository', () => {
  it('walks the members page by page in uuid order, as PostgreSQL does, whatever the case of the ids', async () => {
    const repository = new InMemoryTenantAccessRepository();
    for (const userId of [UPPER, FIRST, LOWER]) {
      await repository.insertMembership(membershipOf(userId));
    }

    const walked: string[] = [];
    let after: string | undefined;
    for (let page = 0; page < 4; page += 1) {
      const members = await repository.listMembershipsAfter(after, 1);
      walked.push(...members.map((member) => member.userId));
      after = members.at(-1)?.userId ?? after;
    }

    expect(walked).toEqual([FIRST, LOWER, UPPER]);
  });
});
