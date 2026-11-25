import {
  FeatureFlag,
  Permission,
  PlanFeature,
  PlatformRole,
  type UserAccess,
} from '@contracts/identity';
import { InMemoryAccessFacade } from '../../modules/access/__tests__/utils/index.js';
import { AccessFacadeGrantSource } from '../access-facade-grant-source.js';

const USER = '018f0000-0000-7000-8000-000000000001';
const TENANT = '018f0000-0000-7000-8000-0000000000a1';
const ACCESS: UserAccess = {
  permissions: [Permission.TasksRead, Permission.TasksWrite],
  roles: ['member'],
  permissionVersion: '4.2',
  platformRoles: [PlatformRole.Support],
  features: [PlanFeature.Billing],
  flags: [FeatureFlag.NewReports],
};

describe('AccessFacadeGrantSource', () => {
  it('maps the access of the facade to an access grant', async () => {
    const source = new AccessFacadeGrantSource(
      new InMemoryAccessFacade().setAccess(USER, TENANT, ACCESS),
    );

    const grant = await source.fetch(TENANT, USER);

    expect(grant).toEqual({
      permissions: ACCESS.permissions,
      platformRoles: ACCESS.platformRoles,
      features: ACCESS.features,
      flags: ACCESS.flags,
      permissionVersion: '4.2',
    });
  });

  it('copies the lists, so the grant does not share them with the facade', async () => {
    const source = new AccessFacadeGrantSource(
      new InMemoryAccessFacade().setAccess(USER, TENANT, ACCESS),
    );

    const grant = await source.fetch(TENANT, USER);

    expect(grant.permissions).not.toBe(ACCESS.permissions);
  });
});
