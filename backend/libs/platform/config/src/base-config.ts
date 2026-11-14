import { z } from 'zod';
import { envBoolean, envList, envNumber } from './env.js';
import { LogLevel } from './log-level.js';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

/**
 * Ambiente desplegado, el mismo que recibe Terraform (`var.environment`).
 * `NODE_ENV` vale `production` en dev, staging y prod, así que no sirve para
 * separar trazas, métricas ni logs por ambiente.
 */
export enum DeployEnvironment {
  Local = 'local',
  Dev = 'dev',
  Staging = 'staging',
  Prod = 'prod',
}

/**
 * Variables que comparten todos los servicios. Cada servicio la extiende con
 * `.extend({...})`.
 *
 * Es agnóstica a la nube: lo propio de AWS (`AWS_REGION`, endpoints de
 * LocalStack) lo declara el adaptador de AWS en su propia configuración.
 *
 * Las variables `OTEL_EXPORTER_OTLP_*` (endpoint, encabezados, protocolo) no
 * están aquí: los exportadores OTLP las leen del ambiente con las reglas del
 * estándar, y una segunda lectura podría interpretarlas distinto.
 */
export const baseConfigSchema = z.object({
  NODE_ENV: z.enum(NodeEnv).default(NodeEnv.Development),
  SERVICE_NAME: z.string().trim().min(1),
  /** Ambiente desplegado. Viaja como `deployment.environment.name`. */
  DEPLOY_ENVIRONMENT: z
    .enum(DeployEnvironment)
    .default(DeployEnvironment.Local),
  /** Versión desplegada. Viaja como `service.version` en trazas, métricas y logs. */
  SERVICE_VERSION: z.string().trim().min(1).optional(),
  LOG_LEVEL: z.enum(LogLevel).default(LogLevel.Info),
  /** Probabilidad (de 0 a 1) de que una petición loguee en debug. */
  LOG_SAMPLE_RATE: envNumber({ min: 0, max: 1 }).default(0),
  /** Módulos (`context` del logger) que loguean en debug sin importar el nivel. */
  LOG_DEBUG_CONTEXTS: envList().default([]),
  /** Registra cada SQL. Apagado por defecto; las queries lentas se registran siempre. */
  DB_LOG_QUERIES: envBoolean().default(false),
  /** Milisegundos a partir de los cuales una query se registra como lenta. */
  DB_SLOW_QUERY_MS: envNumber({ min: 0 }).default(500),
  /** Apaga el SDK de OpenTelemetry: no se exportan trazas, métricas ni logs OTLP. */
  OTEL_SDK_DISABLED: envBoolean().default(false),
  /** Intervalo de exportación de métricas, en milisegundos. */
  OTEL_METRIC_EXPORT_INTERVAL: envNumber({ min: 1000 }).default(60_000),
});

/** Configuración base ya validada. */
export type BaseConfig = z.infer<typeof baseConfigSchema>;
