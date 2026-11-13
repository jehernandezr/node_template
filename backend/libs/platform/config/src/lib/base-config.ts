import { z } from 'zod';
import { envBoolean, envList, envNumber } from './env.js';
import { LogLevel } from './log-level.js';
import { secret } from './secret.js';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

/** Endpoint OTLP HTTP del OpenTelemetry Collector local (docker compose). */
export const DEFAULT_OTLP_ENDPOINT = 'http://localhost:4318';

/**
 * Variables que comparten todos los servicios. Cada servicio la extiende con
 * `.extend({...})`.
 *
 * Es agnóstica a la nube: lo propio de AWS (`AWS_REGION`, endpoints de
 * LocalStack) lo declara el adaptador de AWS en su propia configuración.
 *
 * Las variables `OTEL_*` usan los nombres estándar de OpenTelemetry, así el
 * Collector, la capa ADOT de Lambda y el SDK leen lo mismo.
 */
export const baseConfigSchema = z.object({
  NODE_ENV: z.enum(NodeEnv).default(NodeEnv.Development),
  SERVICE_NAME: z.string().trim().min(1),
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
  /** Base OTLP HTTP del Collector. El SDK agrega `/v1/traces`, `/v1/metrics` y `/v1/logs`. */
  OTEL_EXPORTER_OTLP_ENDPOINT: z.url().default(DEFAULT_OTLP_ENDPOINT),
  /** Headers OTLP con formato `clave=valor,clave2=valor2`. Pueden llevar credenciales. */
  OTEL_EXPORTER_OTLP_HEADERS: secret().optional(),
  /** Intervalo de exportación de métricas, en milisegundos. */
  OTEL_METRIC_EXPORT_INTERVAL: envNumber({ min: 1000 }).default(60_000),
});

/** Configuración base ya validada. */
export type BaseConfig = z.infer<typeof baseConfigSchema>;
