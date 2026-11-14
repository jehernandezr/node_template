import { z } from 'zod';
import { ConfigSection } from '../config-section.js';
import { DeployEnvironment } from '../enums/deploy-environment.enum.js';
import { NodeEnv } from '../enums/node-env.enum.js';

/**
 * Identidad del servicio. Es agnóstica a la nube: lo propio de AWS o de
 * Valkey lo declara el adaptador en su sección.
 */
export const serviceConfigSchema = z.object({
  NODE_ENV: z.enum(NodeEnv).default(NodeEnv.Development),
  SERVICE_NAME: z.string().trim().min(1),
  /** Ambiente desplegado. Viaja como `deployment.environment.name`. */
  DEPLOY_ENVIRONMENT: z
    .enum(DeployEnvironment)
    .default(DeployEnvironment.Local),
  /** Versión desplegada. Viaja como `service.version` en trazas, métricas y logs. */
  SERVICE_VERSION: z.string().trim().min(1).optional(),
});

export type ServiceSettings = z.infer<typeof serviceConfigSchema>;

export const ServiceConfig = new ConfigSection<ServiceSettings>(
  'service',
  serviceConfigSchema,
);
