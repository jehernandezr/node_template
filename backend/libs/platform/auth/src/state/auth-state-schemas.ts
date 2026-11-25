import {
  FeatureFlagSchema,
  PermissionSchema,
  PlanFeatureSchema,
  PlatformRoleSchema,
} from '@contracts/identity';
import { z } from 'zod';
import { ApiKeyEnvironment } from '../api-keys/api-key-environment.enum.js';

/**
 * Shape in which epochs, grants and API key principals are stored in Valkey.
 * Writer and reader share it, so a shape change breaks both at once and not
 * in production.
 */
export class AuthStateSchemas {
  static readonly EPOCH = z.object({
    revokedBefore: z.number().int().nonnegative(),
    suspended: z.boolean(),
  });

  static readonly ACCESS_GRANT = z.object({
    permissions: z.array(PermissionSchema),
    platformRoles: z.array(PlatformRoleSchema),
    features: z.array(PlanFeatureSchema),
    flags: z.array(FeatureFlagSchema),
    permissionVersion: z.string().regex(/^\d{1,15}\.\d{1,15}$/),
  });

  static readonly API_KEY_PRINCIPAL = z.object({
    apiKeyId: z.string().min(1),
    serviceAccountId: z.string().min(1),
    tenantId: z.string().min(1),
    environment: z.enum(ApiKeyEnvironment),
    permissions: z.array(PermissionSchema),
    expiresAt: z.number().int().positive().optional(),
  });
}
