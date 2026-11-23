import {
  FeatureFlag,
  GetUserAccessOperation,
  IdentityErrorCode,
  Permission,
  PlanFeature,
  type GetUserAccessInput,
  type UserAccess,
} from '@contracts/identity';
import { PlatformErrorCode } from '@contracts/platform';
import { OperationHandler, type HandlerResult } from '@platform/internal-api';
import { InProcessInternalApi } from '@platform/internal-api/test-utils';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import { CallOutcome } from '@platform/primitives';
import { InternalAccessGrantSource } from '../internal-access-grant-source.js';

const TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f02';
const MEMBER = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f01';
const STRANGER = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f09';

/** Identity de mentira: conoce el acceso de un solo miembro del tenant. */
class StubUserAccessHandler extends OperationHandler<
  typeof GetUserAccessOperation
> {
  async handle(input: GetUserAccessInput): Promise<HandlerResult<UserAccess>> {
    if (input.userId !== MEMBER || input.tenantId !== TENANT) {
      return {
        outcome: CallOutcome.businessError(IdentityErrorCode.UserNotFound),
      };
    }
    return {
      outcome: CallOutcome.success({
        permissions: [Permission.TasksRead],
        roles: ['member'],
        permissionVersion: '3.7',
        platformRoles: [],
        features: [PlanFeature.AdvancedReports],
        flags: [FeatureFlag.NewReports],
      }),
    };
  }
}

describe('InternalAccessGrantSource', () => {
  const ids = new SequentialIdGenerator();
  const api = new InProcessInternalApi({
    clock: new FixedClock(),
    ids,
    operations: [GetUserAccessOperation],
  });
  api.router.register(GetUserAccessOperation, new StubUserAccessHandler());
  const source = new InternalAccessGrantSource(api.client, ids);

  it('returns the permissions, features and flags identity answers', async () => {
    await expect(source.fetch(TENANT, MEMBER)).resolves.toEqual({
      permissions: [Permission.TasksRead],
      platformRoles: [],
      features: [PlanFeature.AdvancedReports],
      flags: [FeatureFlag.NewReports],
      permissionVersion: '3.7',
    });
  });

  it('reports the auth state as unavailable when identity does not answer with a grant', async () => {
    await expect(source.fetch(TENANT, STRANGER)).rejects.toMatchObject({
      code: PlatformErrorCode.ResilienceCircuitOpen,
    });
  });
});
