import { MembershipChangeKind } from '@contracts/identity';
import { InMemoryAccessFacade } from '../../modules/access/__tests__/utils/index.js';
import { InMemoryUsersFacade } from '../../modules/users/__tests__/utils/index.js';
import { AccessProjectionConsumer } from '../access-projection.consumer.js';

describe('AccessProjectionConsumer', () => {
  const change = (userId: string) => ({
    tenantId: 'tenant-acme',
    userId,
    kind: MembershipChangeKind.Added,
    groupIds: [],
    changedAt: '2026-11-16T10:00:00.000Z',
  });

  it('projects the membership of the user into her shard', async () => {
    const users = new InMemoryUsersFacade();
    const access = new InMemoryAccessFacade();
    const ref = await users.register({
      email: 'ana@example.com',
      password: 'x',
      displayName: 'Ana',
      locale: 'es-MX',
      homeTenantId: 'tenant-casa',
    });

    await new AccessProjectionConsumer(users, access).onMembershipChanged(
      change(ref.userId),
    );

    expect(access.projected).toEqual([{ tenantId: 'tenant-acme', ref }]);
  });

  it('ignores a user that no longer exists', async () => {
    const access = new InMemoryAccessFacade();

    await new AccessProjectionConsumer(
      new InMemoryUsersFacade(),
      access,
    ).onMembershipChanged(change('user-borrado'));

    expect(access.projected).toEqual([]);
  });
});
