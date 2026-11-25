import { z } from 'zod';
import { ConfigSection } from '../config-section.js';
import { DeployEnvironment } from '../enums/deploy-environment.enum.js';
import { NodeEnv } from '../enums/node-env.enum.js';

/**
 * Service identity. It is cloud-agnostic: what is specific to AWS or
 * Valkey is declared by the adapter in its section.
 */
export const serviceConfigSchema = z.object({
  NODE_ENV: z.enum(NodeEnv).default(NodeEnv.Development),
  SERVICE_NAME: z.string().trim().min(1),
  /** Deployed environment. Travels as `deployment.environment.name`. */
  DEPLOY_ENVIRONMENT: z
    .enum(DeployEnvironment)
    .default(DeployEnvironment.Local),
  /** Deployed version. Travels as `service.version` in traces, metrics and logs. */
  SERVICE_VERSION: z.string().trim().min(1).optional(),
});

export type ServiceSettings = z.infer<typeof serviceConfigSchema>;

export const ServiceConfig = new ConfigSection<ServiceSettings>(
  'service',
  serviceConfigSchema,
);
