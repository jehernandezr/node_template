import { Permission } from '@contracts/identity';
import { EffectiveAccessCalculator } from '../effective-access-calculator.js';

describe('EffectiveAccessCalculator', () => {
  it('joins the permissions of the roles of the groups of the member, once each', () => {
    const access = new EffectiveAccessCalculator().calculate(
      {
        id: 'm-1',
        tenantId: 't',
        userId: 'u',
        homeTenantId: 't',
        groupIds: ['g-1', 'g-2'],
        permissionVersion: 1,
        joinedAt: new Date(0),
        leavingSince: null,
      },
      [
        {
          id: 'g-1',
          tenantId: 't',
          name: 'A',
          systemRole: null,
          roleIds: ['r-1'],
        },
        {
          id: 'g-2',
          tenantId: 't',
          name: 'B',
          systemRole: null,
          roleIds: ['r-1', 'r-2'],
        },
        {
          id: 'g-3',
          tenantId: 't',
          name: 'C',
          systemRole: null,
          roleIds: ['r-3'],
        },
      ],
      [
        {
          id: 'r-1',
          tenantId: 't',
          name: 'Read',
          systemRole: null,
          permissions: [Permission.TasksRead],
        },
        {
          id: 'r-2',
          tenantId: 't',
          name: 'Write',
          systemRole: null,
          permissions: [Permission.TasksRead, Permission.TasksWrite],
        },
        {
          id: 'r-3',
          tenantId: 't',
          name: 'Foreign',
          systemRole: null,
          permissions: [Permission.BillingRead],
        },
      ],
    );

    expect(access).toEqual({
      permissions: [Permission.TasksRead, Permission.TasksWrite],
      roles: ['Read', 'Write'],
    });
  });
});
