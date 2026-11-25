import { AccessKind, PlatformErrorCode } from '@contracts/platform';
import { identityContract } from '../contract.js';
import { MfaRules } from '../constants/identity.constants.js';
import {
  BillingReference,
  IdentityErrorCode,
  IdentityRoute,
} from '../enums/identifiers.enum.js';
import { Permission } from '../enums/access.enum.js';

const routes = Object.values(identityContract.routes);
const knownErrorCodes = new Set<string>([
  ...Object.values(IdentityErrorCode),
  ...Object.values(PlatformErrorCode),
  BillingReference.QuotaExceeded,
]);

/** Step-up routes: sensitive operations that require a recent MFA. */
const StepUpRouteIds = [
  IdentityRoute.ChangePassword,
  IdentityRoute.RequestEmailChange,
  IdentityRoute.StartTotpEnrollment,
  IdentityRoute.RemoveTotp,
  IdentityRoute.RegenerateRecoveryCodes,
  IdentityRoute.PasskeyRegistrationOptions,
  IdentityRoute.RemovePasskey,
  IdentityRoute.CreateApiKey,
  IdentityRoute.RotateApiKey,
  IdentityRoute.StartAccountDeletion,
  IdentityRoute.InviteUser,
  IdentityRoute.RemoveMember,
  IdentityRoute.SetMemberGroups,
  IdentityRoute.SetGroupRoles,
  IdentityRoute.CreateRole,
  IdentityRoute.UpdateRole,
  IdentityRoute.CreateServiceAccount,
  IdentityRoute.UpdateServiceAccount,
];

describe('identity routes contract', () => {
  it.each(routes.map((route) => [route.id, route] as const))(
    'serves %s under the /v1 prefix',
    (_id, route) => {
      expect(route.path.startsWith('/v1/')).toBe(true);
    },
  );

  it('uses every IdentityRoute value exactly once', () => {
    const used = routes.map((route) => route.id);
    expect([...used].sort()).toEqual(Object.values(IdentityRoute).sort());
    expect(new Set(used).size).toBe(used.length);
  });

  it.each(routes.map((route) => [route.id, route] as const))(
    'declares only known error codes on %s',
    (_id, route) => {
      for (const code of route.errors) {
        expect(knownErrorCodes.has(code)).toBe(true);
      }
    },
  );

  it.each(
    routes
      .filter((route) => route.access.mfaMaxAgeMinutes !== undefined)
      .map((route) => [route.id, route] as const),
  )('requires MFA step-up with the shared window on %s', (_id, route) => {
    expect(route.access.mfaMaxAgeMinutes).toBe(MfaRules.stepUpMaxAgeMinutes);
    expect(route.errors).toContain(IdentityErrorCode.MfaStepUpRequired);
  });

  it('marks exactly the sensitive operations as step-up routes', () => {
    const stepUp = routes
      .filter((route) => route.access.mfaMaxAgeMinutes !== undefined)
      .map((route) => route.id);
    expect([...stepUp].sort()).toEqual([...StepUpRouteIds].sort());
  });

  it.each(
    routes
      .filter((route) => route.access.permissions !== undefined)
      .map((route) => [route.id, route] as const),
  )('answers AuthForbidden on permission route %s', (_id, route) => {
    expect(route.errors).toContain(PlatformErrorCode.AuthForbidden);
    for (const permission of route.access.permissions ?? []) {
      expect(Object.values(Permission)).toContain(permission);
    }
  });

  it.each(
    routes
      .filter((route) => route.access.kind === AccessKind.Public)
      .map((route) => [route.id, route] as const),
  )('rate limits the public route %s', (_id, route) => {
    expect(route.errors).toContain(PlatformErrorCode.RateLimitExceeded);
  });

  it('answers 202 without body for sign-up and 204 for a confirmed email', () => {
    expect(identityContract.routes.signUp).toMatchObject({
      successStatus: 202,
      response: null,
    });
    expect(identityContract.routes.confirmEmailVerification).toMatchObject({
      successStatus: 204,
      response: null,
    });
  });
});
