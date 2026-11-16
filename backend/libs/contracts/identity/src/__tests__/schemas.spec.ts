import { validateContract } from '@contracts/platform';
import { z } from 'zod';
import { identityContract } from '../contract.js';
import {
  PasskeyOptionsSchema,
  UserAccessSchema,
  SessionAccessSchema,
} from '../schemas/index.js';
import { Ids, UuidV4 } from './utils/fixtures.js';
import { ValidRequests } from './utils/examples.js';

const schemas = identityContract.schemas as Record<string, z.ZodType>;

describe('identity request schemas', () => {
  it.each(
    Object.entries(ValidRequests).map(
      ([name, example]) => [name, example] as const,
    ),
  )('accepts a valid %s', (name, example) => {
    expect(validateContract(schemas[name], example).ok).toBe(true);
  });

  it.each(
    Object.entries(ValidRequests).map(
      ([name, example]) => [name, example] as const,
    ),
  )('rejects an unknown field in %s', (name, example) => {
    expect(
      validateContract(schemas[name], { ...example, unexpectedField: 1 }).ok,
    ).toBe(false);
  });

  it('rejects a UUID that is not v7 in a path identifier', () => {
    expect(
      validateContract(schemas.RemovePasskeyRequest, { passkeyId: UuidV4 }).ok,
    ).toBe(false);
    expect(
      validateContract(schemas.RemoveDeviceRequest, { deviceId: UuidV4 }).ok,
    ).toBe(false);
  });

  it('bounds the text fields with the identity limits', () => {
    expect(
      validateContract(schemas.SignUpRequest, {
        ...ValidRequests.SignUpRequest,
        displayName: 'a'.repeat(121),
      }).ok,
    ).toBe(false);
    expect(
      validateContract(schemas.AcceptInvitationRequest, {
        token: 'a'.repeat(513),
      }).ok,
    ).toBe(false);
    expect(
      validateContract(schemas.CreateRoleRequest, {
        name: 'a'.repeat(81),
        permissions: [],
      }).ok,
    ).toBe(false);
  });

  it('accepts only the base64url alphabet in passkey options', () => {
    const valid = { challengeId: Ids.challenge, optionsJson: 'abc-_123' };
    expect(validateContract(PasskeyOptionsSchema, valid).ok).toBe(true);
    expect(
      validateContract(PasskeyOptionsSchema, {
        ...valid,
        optionsJson: 'abc+/==',
      }).ok,
    ).toBe(false);
  });

  it('requires the roles and permission version in the user access', () => {
    const access = {
      permissions: ['billing:read'],
      roles: ['admin'],
      permissionVersion: '2.4',
      platformRoles: [],
      features: [],
      flags: [],
    };
    expect(validateContract(UserAccessSchema, access).ok).toBe(true);
    const withoutRoles = Object.fromEntries(
      Object.entries(access).filter(([key]) => key !== 'roles'),
    );
    expect(validateContract(UserAccessSchema, withoutRoles).ok).toBe(false);
    const withoutVersion = Object.fromEntries(
      Object.entries(access).filter(([key]) => key !== 'permissionVersion'),
    );
    expect(validateContract(UserAccessSchema, withoutVersion).ok).toBe(false);
    expect(
      validateContract(SessionAccessSchema, {
        ...access,
        userId: Ids.user,
        tenantId: Ids.tenant,
        sessionId: Ids.session,
        mfaVerifiedAt: null,
      }).ok,
    ).toBe(true);
  });
});

describe('identity schemas for the JSON Schema export', () => {
  it.each(Object.entries(identityContract.schemas))(
    'exports %s to JSON Schema',
    (_name, schema) => {
      expect(() => z.toJSONSchema(schema)).not.toThrow();
    },
  );
});
