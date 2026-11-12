import {
  ErrorAudience,
  HttpMethod,
  messageKeyFor,
  PlatformErrorCode,
  validateContract,
} from '@contracts/platform';
import { identityContract } from './contract.js';
import {
  FeatureFlag,
  Permission,
  PlanFeature,
  PlatformRole,
} from './enums/access.enum.js';
import { IdentityErrorCode } from './enums/identifiers.enum.js';
import { identityErrorCatalog } from './errors/identity-error-catalog.js';
import {
  RevokeSessionRoute,
  ListSessionsRoute,
} from './http/session.routes.js';
import { SignInRoute, VerifyMfaRoute } from './http/auth.routes.js';
import { RevokeUserSessionsOperation } from './internal/identity.operations.js';

describe('identity access enums', () => {
  it('keep exactly the wire values the front already uses', () => {
    expect(Object.values(Permission)).toEqual([
      'tasks:read',
      'tasks:write',
      'billing:read',
      'backoffice:access',
    ]);
    expect(Object.values(PlatformRole)).toEqual([
      'super_admin',
      'support',
      'finance',
      'read_only',
    ]);
    expect(Object.values(PlanFeature)).toEqual([
      'ai_assistant',
      'webhooks',
      'billing',
    ]);
    expect(Object.values(FeatureFlag)).toEqual(['new_reports']);
  });
});

describe('identityErrorCatalog', () => {
  it('has one entry per code with the ARB message key', () => {
    expect(identityErrorCatalog.map((e) => e.code)).toEqual(
      Object.values(IdentityErrorCode),
    );
    for (const entry of identityErrorCatalog) {
      expect(entry.messageKey).toBe(messageKeyFor(entry.code));
      expect(entry.code.startsWith('IDENTITY.')).toBe(true);
    }
    const userNotFound = identityErrorCatalog.find(
      (e) => e.code === IdentityErrorCode.UserNotFound,
    );
    expect(userNotFound?.audience).toBe(ErrorAudience.Internal);
  });
});

describe('identity routes', () => {
  it('declares the sign-in and MFA routes as public POSTs', () => {
    expect(SignInRoute).toMatchObject({
      method: HttpMethod.Post,
      path: '/v1/auth/sign-in',
      successStatus: 200,
    });
    expect(VerifyMfaRoute.errors).toContain(IdentityErrorCode.MfaCodeExpired);
  });

  it('puts the session id in the path and answers 204', () => {
    expect(RevokeSessionRoute.pathParams).toEqual(['sessionId']);
    expect(RevokeSessionRoute.successStatus).toBe(204);
    expect(RevokeSessionRoute.method).toBe(HttpMethod.Delete);
  });

  it('validates requests with platform field errors', () => {
    expect(
      validateContract(SignInRoute.request, {
        email: 'not-an-email',
        password: '',
      }),
    ).toEqual({
      ok: false,
      errors: [
        { field: 'email', code: PlatformErrorCode.ValidationInvalidFormat },
        { field: 'password', code: PlatformErrorCode.ValidationTooShort },
      ],
    });
    expect(validateContract(ListSessionsRoute.request, { limit: 500 })).toEqual(
      {
        ok: false,
        errors: [
          { field: 'limit', code: PlatformErrorCode.ValidationTooLarge },
        ],
      },
    );
    expect(
      validateContract(VerifyMfaRoute.request, {
        mfaToken: 't',
        method: 'device_otp',
        code: '12345678',
      }).ok,
    ).toBe(true);
  });
});

describe('identityContract', () => {
  it('registers every schema used by routes, operations and events', () => {
    const registered = new Set(Object.values(identityContract.schemas));
    for (const route of Object.values(identityContract.routes)) {
      if (route.response) expect(registered.has(route.response)).toBe(true);
    }
    for (const op of Object.values(identityContract.operations)) {
      expect(registered.has(op.input)).toBe(true);
      expect(registered.has(op.output)).toBe(true);
    }
    for (const event of Object.values(identityContract.events)) {
      expect(registered.has(event.payload)).toBe(true);
    }
  });

  it('declares the compensation of mutating operations', () => {
    expect(RevokeUserSessionsOperation.compensatedBy).toBe('none');
    expect(RevokeUserSessionsOperation.compensationReason).toBeTruthy();
  });
});
