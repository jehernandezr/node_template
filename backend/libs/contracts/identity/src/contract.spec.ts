import {
  AccessKind,
  decodeQuery,
  ErrorAudience,
  HttpMethod,
  MessageKind,
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
import {
  IdentityErrorCode,
  IdentityOperation,
} from './enums/identifiers.enum.js';
import { identityErrorCatalog } from './errors/identity-error-catalog.js';
import {
  GetSessionAccessRoute,
  RevokeSessionRoute,
  ListSessionsRoute,
} from './http/session.routes.js';
import {
  RefreshSessionRoute,
  RequestMfaChallengeRoute,
  SignInRoute,
  SignOutRoute,
  VerifyMfaRoute,
} from './http/auth.routes.js';
import { SessionGuardErrors } from './http/session-guard.errors.js';
import {
  RequestStepUpChallengeRoute,
  StartStepUpRoute,
  VerifyStepUpRoute,
} from './http/step-up.routes.js';
import { IdentityEventsTopic } from './events/identity.topics.js';
import { SessionRevokedEvent } from './events/identity.events.js';
import { RevokeUserSessionsOperation } from './internal/identity.operations.js';

describe('identity access enums', () => {
  it('keep exactly the wire values the front already uses', () => {
    expect(Object.values(Permission)).toEqual([
      'tasks:read',
      'tasks:write',
      'billing:read',
      'billing:write',
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
        challengeId: '0190f2a4-7b3c-7d4e-8f00-000000000001',
        code: '12345678',
      }).ok,
    ).toBe(true);
  });

  it('decodes the query text before validating a paginated route', () => {
    expect(
      validateContract(
        ListSessionsRoute.request,
        decodeQuery(ListSessionsRoute, { limit: '20' }),
      ),
    ).toEqual({ ok: true, value: { limit: 20 } });
    expect(ListSessionsRoute.queryParams.map((p) => p.name)).toEqual([
      'limit',
      'after',
    ]);
  });

  it('declares the MFA challenge step and the session access route', () => {
    expect(RequestMfaChallengeRoute).toMatchObject({
      method: HttpMethod.Post,
      path: '/v1/auth/mfa/challenges',
      successStatus: 201,
    });
    expect(
      validateContract(RequestMfaChallengeRoute.request, {
        mfaToken: 't',
        method: 'email_otp',
      }).ok,
    ).toBe(true);
    expect(GetSessionAccessRoute).toMatchObject({
      method: HttpMethod.Get,
      path: '/v1/me/access',
      version: 1,
    });
    expect(
      validateContract(GetSessionAccessRoute.response, {
        userId: '0190f2a4-7b3c-7d4e-8f00-000000000001',
        tenantId: '0190f2a4-7b3c-7d4e-8f00-000000000002',
        sessionId: '0190f2a4-7b3c-7d4e-8f00-000000000003',
        permissions: ['billing:write'],
        platformRoles: [],
        features: ['billing'],
        flags: [],
        mfaVerifiedAt: null,
      }).ok,
    ).toBe(true);
  });
});

describe('session lifecycle routes', () => {
  const challengeId = '0190f2a4-7b3c-7d4e-8f00-000000000001';

  it('refreshes and signs out with an optional session token', () => {
    expect(RefreshSessionRoute).toMatchObject({
      method: HttpMethod.Post,
      path: '/v1/auth/refresh',
      successStatus: 200,
      access: { kind: AccessKind.Public },
    });
    expect(SignOutRoute).toMatchObject({
      method: HttpMethod.Post,
      path: '/v1/auth/sign-out',
      successStatus: 204,
      response: null,
      access: { kind: AccessKind.Public },
    });
    for (const route of [RefreshSessionRoute, SignOutRoute]) {
      // En web el session token viaja en la cookie y el cuerpo va vacío.
      expect(validateContract(route.request, {}).ok).toBe(true);
      expect(validateContract(route.request, { sessionToken: 's1' }).ok).toBe(
        true,
      );
      expect(
        validateContract(route.request, { sessionToken: '' }),
      ).toMatchObject({ ok: false });
      expect(
        validateContract(route.request, { refreshToken: 's1' }),
      ).toMatchObject({ ok: false });
    }
  });

  it('declares the codes that end a session on refresh', () => {
    expect(RefreshSessionRoute.errors).toEqual(
      expect.arrayContaining([
        IdentityErrorCode.SessionRevoked,
        IdentityErrorCode.SessionExpired,
        IdentityErrorCode.SessionReused,
        IdentityErrorCode.UserSuspended,
        IdentityErrorCode.TenantSuspended,
        PlatformErrorCode.AuthUnauthenticated,
      ]),
    );
  });

  it('runs the step-up of an open session with the MFA types', () => {
    for (const route of [
      StartStepUpRoute,
      RequestStepUpChallengeRoute,
      VerifyStepUpRoute,
    ]) {
      expect(route.method).toBe(HttpMethod.Post);
      expect(route.path.startsWith('/v1/me/step-up')).toBe(true);
      expect(route.access.kind).toBe(AccessKind.Authenticated);
      expect(route.errors).toEqual(expect.arrayContaining(SessionGuardErrors));
    }
    expect(StartStepUpRoute.successStatus).toBe(201);
    expect(RequestStepUpChallengeRoute.request).toBe(
      RequestMfaChallengeRoute.request,
    );
    expect(RequestStepUpChallengeRoute.errors).toContain(
      IdentityErrorCode.MfaMethodUnavailable,
    );
    expect(RequestMfaChallengeRoute.errors).toContain(
      IdentityErrorCode.MfaMethodUnavailable,
    );
    expect(
      validateContract(VerifyStepUpRoute.request, {
        mfaToken: 't',
        challengeId,
        code: '12345678',
      }).ok,
    ).toBe(true);
    // El paso adicional no registra dispositivos.
    expect(
      validateContract(VerifyStepUpRoute.request, {
        mfaToken: 't',
        challengeId,
        code: '12345678',
        devicePublicKey: 'abc',
      }),
    ).toMatchObject({ ok: false });
    expect(
      validateContract(VerifyStepUpRoute.response, {
        tokens: {
          accessToken: 'a',
          accessExpiresAt: '2026-11-13T12:15:00.000Z',
        },
        mfaVerifiedAt: '2026-11-13T12:00:00.000Z',
      }).ok,
    ).toBe(true);
  });

  it('makes the invalidation codes public with a message key', () => {
    for (const code of [
      IdentityErrorCode.SessionExpired,
      IdentityErrorCode.SessionReused,
      IdentityErrorCode.TokenRevoked,
      IdentityErrorCode.UserSuspended,
      IdentityErrorCode.TenantSuspended,
    ]) {
      const entry = identityErrorCatalog.find((e) => e.code === code);
      expect(entry).toMatchObject({
        audience: ErrorAudience.Public,
        retryable: false,
      });
      expect([401, 403]).toContain(entry?.httpStatus);
    }
    expect(
      identityErrorCatalog.find(
        (e) => e.code === IdentityErrorCode.MfaMethodUnavailable,
      ),
    ).toMatchObject({ httpStatus: 400, audience: ErrorAudience.Public });
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

  it('versions the operation ids', () => {
    for (const id of Object.values(IdentityOperation)) {
      expect(id).toMatch(/\.v1$/);
    }
  });

  it('publishes every event in the identity topic', () => {
    expect(identityContract.topics['events']).toBe(IdentityEventsTopic);
    expect(IdentityEventsTopic.events).toContain(SessionRevokedEvent);
    expect(SessionRevokedEvent.kind).toBe(MessageKind.Event);
  });

  it('declares the compensation of mutating operations', () => {
    expect(RevokeUserSessionsOperation.compensatedBy).toBe('none');
    expect(RevokeUserSessionsOperation.compensationReason).toBeTruthy();
  });
});
