import { TenantKind, TenantLifecycle } from '@contracts/identity';
import { FixedClock } from '@platform/kernel/test-utils';
import { InMemoryApiKeysFacade } from '../../../api-keys/__tests__/utils/index.js';
import { InMemoryPasskeysFacade } from '../../../passkeys/__tests__/utils/index.js';
import { InMemoryTenantsFacade } from '../../../tenants/__tests__/utils/index.js';
import { InMemoryUsersFacade } from '../../../users/__tests__/utils/index.js';
import { TenantMoveStatus } from '../../domain/tenant-move-status.enum.js';
import { InMemoryTenantMoveLog } from '../../__tests__/utils/index.js';
import { IdentityTenantMoveListener } from '../identity-tenant-move.listener.js';

const TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a05';
const MOVE = {
  moveId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f12',
  tenantId: TENANT,
  targetGroup: 'sa-group-1',
  targetRegion: 'sa-east-1',
};

describe('IdentityTenantMoveListener', () => {
  const setup = async () => {
    const clock = new FixedClock(new Date('2026-11-24T10:00:00.000Z'));
    const tenants = new InMemoryTenantsFacade().add({
      id: TENANT,
      slug: 'acme',
      name: 'Acme',
      region: 'us-east-1',
      kind: TenantKind.Organization,
      status: TenantLifecycle.Active,
    });
    const users = new InMemoryUsersFacade();
    const passkeys = new InMemoryPasskeysFacade();
    const apiKeys = new InMemoryApiKeysFacade();
    const log = new InMemoryTenantMoveLog();
    await log.start({
      ...MOVE,
      sagaId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f11',
      status: TenantMoveStatus.Running,
      startedAt: clock.now(),
    });
    const listener = new IdentityTenantMoveListener(
      tenants,
      users,
      passkeys,
      apiKeys,
      log,
    );
    return { clock, tenants, users, passkeys, apiKeys, log, listener };
  };

  it('points the tenant, its users, their passkeys and its API keys to the target region', async () => {
    const { tenants, users, passkeys, apiKeys, listener } = await setup();

    await listener.switched(MOVE);

    await expect(tenants.get(TENANT)).resolves.toMatchObject({
      region: 'sa-east-1',
    });
    expect(users.regionOfHomeTenant(TENANT)).toBe('sa-east-1');
    expect(passkeys.regionOfHomeTenant(TENANT)).toBe('sa-east-1');
    expect(apiKeys.regionOfTenant(TENANT)).toBe('sa-east-1');
  });

  it('leaves the move running: the other services may still point to the source', async () => {
    const { log, listener } = await setup();

    await listener.switched(MOVE);

    expect(log.find(MOVE.moveId)).toMatchObject({
      status: TenantMoveStatus.Running,
    });
    expect(log.find(MOVE.moveId)?.switchedAt).toBeUndefined();
  });

  it('records a cancelled move as aborted', async () => {
    const { log, listener } = await setup();

    await listener.aborted(MOVE);

    expect(log.find(MOVE.moveId)?.status).toBe(TenantMoveStatus.Aborted);
  });
});
