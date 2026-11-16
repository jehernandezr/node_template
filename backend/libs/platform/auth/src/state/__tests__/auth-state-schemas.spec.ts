import {
  FeatureFlag,
  Permission,
  PlanFeature,
  PlatformRole,
} from '@contracts/identity';
import { ApiKeyEnvironment } from '../../api-keys/api-key-environment.enum.js';
import { AuthStateSchemas } from '../auth-state-schemas.js';

const GRANT = {
  permissions: [Permission.TasksRead, Permission.BillingWrite],
  platformRoles: [PlatformRole.SuperAdmin],
  features: [PlanFeature.AiAssistant],
  flags: [FeatureFlag.NewReports],
  permissionVersion: '3.7',
};

const PRINCIPAL = {
  apiKeyId: 'key-1',
  serviceAccountId: 'service-1',
  tenantId: 'tenant-1',
  environment: ApiKeyEnvironment.Live,
  permissions: [Permission.TasksRead],
};

describe('AuthStateSchemas', () => {
  describe('EPOCH', () => {
    it('accepts a stored epoch', () => {
      expect(
        AuthStateSchemas.EPOCH.safeParse({
          revokedBefore: 10,
          suspended: false,
        }).success,
      ).toBe(true);
    });

    it.each([
      [{ revokedBefore: -1, suspended: false }],
      [{ revokedBefore: 1.5, suspended: false }],
      [{ revokedBefore: 10 }],
    ])('rejects %j', (value) => {
      expect(AuthStateSchemas.EPOCH.safeParse(value).success).toBe(false);
    });
  });

  describe('ACCESS_GRANT', () => {
    it('accepts a grant with real values of each enum', () => {
      expect(AuthStateSchemas.ACCESS_GRANT.safeParse(GRANT).success).toBe(true);
    });

    it('rejects a permission outside the enum', () => {
      expect(
        AuthStateSchemas.ACCESS_GRANT.safeParse({
          ...GRANT,
          permissions: ['admin:everything'],
        }).success,
      ).toBe(false);
    });

    it('rejects a permission version without the tenant and user parts', () => {
      expect(
        AuthStateSchemas.ACCESS_GRANT.safeParse({
          ...GRANT,
          permissionVersion: '1',
        }).success,
      ).toBe(false);
    });
  });

  describe('API_KEY_PRINCIPAL', () => {
    it('accepts a principal with and without expiresAt', () => {
      expect(
        AuthStateSchemas.API_KEY_PRINCIPAL.safeParse(PRINCIPAL).success,
      ).toBe(true);
      expect(
        AuthStateSchemas.API_KEY_PRINCIPAL.safeParse({
          ...PRINCIPAL,
          expiresAt: 1_900_000_000,
        }).success,
      ).toBe(true);
    });

    it('rejects an environment outside live and test', () => {
      expect(
        AuthStateSchemas.API_KEY_PRINCIPAL.safeParse({
          ...PRINCIPAL,
          environment: 'prod',
        }).success,
      ).toBe(false);
    });
  });
});
