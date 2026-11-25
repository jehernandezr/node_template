import {
  AccessKind,
  Compensation,
  deliveredTypes,
  validateContract,
} from '@contracts/platform';
import { identityContract } from '../contract.js';
import { Permission, PlanFeature } from '../enums/access.enum.js';
import {
  BillingReference,
  IdentityEvent,
  IdentityOperation,
  IdentityQueue,
  IdentityRoute,
  IdentitySaga,
  IdentitySagaStatus,
} from '../enums/identifiers.enum.js';
import {
  BillingEventsReference,
  RecordUsageReference,
} from '../events/billing.references.js';
import { SendPasswordResetCommand } from '../events/identity.commands.js';
import {
  BillingEventsQueue,
  PasswordResetsQueue,
} from '../events/identity.queues.js';
import { IdentityEventsTopic } from '../events/identity.topics.js';
import { UserErasedEvent } from '../events/user.events.js';
import {
  GetSagaRoute,
  StartAccountDeletionRoute,
} from '../http/lifecycle.routes.js';
import { CreateTenantRoute } from '../http/tenant.routes.js';
import { SignInRoute } from '../http/auth.routes.js';
import { Ids, Now } from './utils/fixtures.js';

/** Valor de prueba con la forma de un dispositivo, sin parecerse a una credencial. */
const PUSH_HANDLE = 'push-handle-0001';

describe('identity lifecycle contract', () => {
  it('starts the tenant creation as an asynchronous saga', () => {
    expect(CreateTenantRoute.successStatus).toBe(202);
    expect(
      validateContract(CreateTenantRoute.response as never, {
        tenantId: Ids.tenant,
        sagaId: Ids.session,
      }).ok,
    ).toBe(true);
  });

  it('starts the account deletion with a recent second factor', () => {
    expect(StartAccountDeletionRoute).toMatchObject({
      method: 'POST',
      path: '/v1/me/deletion',
      successStatus: 202,
      access: { kind: AccessKind.Authenticated, mfaMaxAgeMinutes: 10 },
    });
    expect(
      validateContract(StartAccountDeletionRoute.response as never, {
        sagaId: Ids.session,
      }).ok,
    ).toBe(true);
  });

  it('reads a saga by id', () => {
    expect(GetSagaRoute.pathParams).toEqual(['sagaId']);
    expect(
      validateContract(GetSagaRoute.response as never, {
        sagaId: Ids.session,
        saga: IdentitySaga.TenantOnboarding,
        status: IdentitySagaStatus.Compensated,
        startedAt: Now,
        finishedAt: null,
      }).ok,
    ).toBe(true);
    expect(validateContract(GetSagaRoute.request, { sagaId: 'x' }).ok).toBe(
      false,
    );
  });

  it('adds the region and the regional API to the sign-in answer', () => {
    expect(
      validateContract(SignInRoute.response as never, {
        status: 'authenticated',
        region: 'us-east-1',
        apiBaseUrl: 'https://api.us-east-1.example.com',
      }).ok,
    ).toBe(true);
    expect(
      validateContract(SignInRoute.response as never, {
        status: 'authenticated',
        apiBaseUrl: 'ftp://nope',
      }).ok,
    ).toBe(false);
  });

  it('adds the reports permissions, the advanced reports feature and the sagas', () => {
    expect(Permission.ReportsRead).toBe('reports:read');
    expect(Permission.ReportsWrite).toBe('reports:write');
    expect(PlanFeature.AdvancedReports).toBe('advanced_reports');
    expect(Object.values(IdentitySaga)).toEqual([
      'identity.tenant-onboarding',
      'identity.delete-account',
      'identity.move-tenant',
    ]);
  });

  it.each([
    [IdentityOperation.ActivateTenant, Compensation.None],
    [IdentityOperation.EraseUser, Compensation.None],
    [IdentityOperation.FinishTenantMove, Compensation.None],
  ])('declares %s as an irreversible step after the pivot', (id, reverse) => {
    const op = Object.values(identityContract.operations).find(
      (candidate) => candidate.id === id,
    );
    expect(op).toMatchObject({ idempotent: true, mutating: true });
    expect(op?.compensatedBy).toBe(reverse);
    expect(op?.compensationReason?.length).toBeGreaterThan(0);
  });

  it('reads push targets and permission holders without compensation', () => {
    const operations = Object.values(identityContract.operations);
    const targets = operations.find(
      (op) => op.id === IdentityOperation.ListPushTargets,
    );
    const holders = operations.find(
      (op) => op.id === IdentityOperation.ListMembersByPermission,
    );
    expect(targets?.mutating).toBe(false);
    expect(holders?.mutating).toBe(false);
    expect(
      validateContract(targets?.input as never, {
        user: { userId: Ids.user, homeTenantId: Ids.tenant },
      }).ok,
    ).toBe(true);
    expect(
      validateContract(targets?.output as never, {
        targets: [
          { deviceId: Ids.device, platform: 'ios', pushToken: PUSH_HANDLE },
        ],
      }).ok,
    ).toBe(true);
    expect(
      validateContract(holders?.input as never, {
        tenantId: Ids.tenant,
        permission: Permission.BillingRead,
        limit: 50,
      }).ok,
    ).toBe(true);
  });

  it('exposes the five tenant move operations of the service', () => {
    const ids = Object.values(identityContract.operations).map((op) => op.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        IdentityOperation.TenantMoveSync,
        IdentityOperation.TenantMoveFinalize,
        IdentityOperation.TenantMoveAbort,
        IdentityOperation.TenantMoveSwitch,
        IdentityOperation.TenantMoveCleanup,
      ]),
    );
  });

  it('publishes the user erasure in the identity topic', () => {
    expect(UserErasedEvent.type).toBe(IdentityEvent.UserErased);
    expect(IdentityEventsTopic.events).toContain(UserErasedEvent);
    expect(
      validateContract(UserErasedEvent.payload, {
        userId: Ids.user,
        homeTenantId: Ids.tenant,
        erasedAt: Now,
      }).ok,
    ).toBe(true);
  });

  it('takes the password reset command in its own queue', () => {
    expect(PasswordResetsQueue.name).toBe(IdentityQueue.PasswordResets);
    expect(identityContract.queues['passwordResets']).toBe(PasswordResetsQueue);
    expect(PasswordResetsQueue.commands).toEqual([SendPasswordResetCommand]);
  });

  it('consumes the billing access events through a reference by name', () => {
    expect(BillingEventsQueue.name).toBe(IdentityQueue.Billing);
    expect(identityContract.queues['billing']).toBe(BillingEventsQueue);
    expect(BillingEventsReference.name).toBe(BillingReference.Topic);
    expect(deliveredTypes(BillingEventsQueue)).toEqual([
      BillingReference.SubscriptionSuspended,
      BillingReference.SubscriptionReactivated,
      BillingReference.EntitlementsChanged,
    ]);
  });

  it('declares the password reset command it sends to itself and the usage command it sends to billing', () => {
    expect(identityContract.sends).toEqual([
      SendPasswordResetCommand,
      RecordUsageReference,
    ]);
    expect(RecordUsageReference.type).toBe(BillingReference.RecordUsage);
  });

  it('lists the routes of the deletion and the saga in the route map', () => {
    expect(IdentityRoute.StartAccountDeletion).toBe('identity.me.deletion');
    expect(identityContract.routes['getSaga']).toBe(GetSagaRoute);
  });
});
