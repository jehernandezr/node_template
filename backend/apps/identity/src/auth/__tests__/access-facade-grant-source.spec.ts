import { Test } from '@nestjs/testing';
import {
  FeatureFlag,
  Permission,
  PlanFeature,
  PlatformRole,
  type UserAccess,
} from '@contracts/identity';
import { AccessFacade } from '../../modules/access/index.js';
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
    const facade = new InMemoryAccessFacade().setAccess(USER, TENANT, ACCESS);
    const moduleRef = await Test.createTestingModule({
      providers: [
        AccessFacadeGrantSource,
        { provide: AccessFacade, useValue: facade },
      ],
    }).compile();

    const grant = await moduleRef
      .get(AccessFacadeGrantSource)
      .fetch(TENANT, USER);

    expect(grant).toEqual({
      permissions: ACCESS.permissions,
      platformRoles: ACCESS.platformRoles,
      features: ACCESS.features,
      flags: ACCESS.flags,
      permissionVersion: '4.2',
    });
  });

  it('rejects when the access facade is not registered yet', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AccessFacadeGrantSource],
    }).compile();

    await expect(
      moduleRef.get(AccessFacadeGrantSource).fetch(TENANT, USER),
    ).rejects.toThrow();
  });
});
