import { ConfigSection, envNumber } from '@platform/config';
import { z } from 'zod';
import { TenantMoveStrategy } from './tenant-move-strategy.enum.js';

const targetSchema = z.object({
  region: z.string().trim().min(1),
  shard: z.string().trim().min(1),
});

/** `{"<grupo>": {"region": "...", "shard": "<shard lógico del servicio>"}}` como JSON en una variable. */
const targetsSchema = z
  .string()
  .default('{}')
  .transform((raw, ctx) => {
    try {
      return z.record(z.string().min(1), targetSchema).parse(JSON.parse(raw));
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: 'expected a JSON object of groups with region and shard',
      });
      return z.NEVER;
    }
  });

export const tenantMoveConfigSchema = z.object({
  /** Grupos de destino: la región y el shard lógico del servicio en ese grupo. El shard debe estar en el directorio. */
  TENANT_MOVE_TARGETS: targetsSchema,
  /**
   * Días que el origen conserva los datos de un tenant trasladado antes de que `cleanup` los borre y baje su barrera.
   * Al menos uno: con cero la barrera bajaría mientras un proceso con el placement viejo en caché todavía escribe ahí.
   */
  TENANT_MOVE_GRACE_DAYS: envNumber({ min: 1, max: 365 }).default(7),
  /**
   * Plazo de la saga de traslado desde que arranca. Pasado antes del pivote, la saga compensa y el tenant vuelve a
   * escribir en el origen en lugar de quedar congelado.
   */
  TENANT_MOVE_DEADLINE_MS: envNumber({ min: 60_000 }).default(21_600_000),
  TENANT_MOVE_STRATEGY: z
    .enum(TenantMoveStrategy)
    .default(TenantMoveStrategy.Batch),
  /** Filas por lote de lectura y escritura. */
  TENANT_MOVE_BATCH_SIZE: envNumber({ min: 1, max: 10_000 }).default(500),
  /** Tiempo de trabajo de una llamada; queda bajo el plazo de 6 s de cada operación de traslado. */
  TENANT_MOVE_CALL_BUDGET_MS: envNumber({ min: 100, max: 5_000 }).default(
    4_000,
  ),
  /** Pausa de la limpieza entre una llamada que responde que su ronda sigue y la siguiente. */
  TENANT_MOVE_CLEANUP_PAUSE_MS: envNumber({ min: 0, max: 60_000 }).default(
    1_000,
  ),
  /** Llamadas de limpieza seguidas a un servicio en una corrida; las que faltan quedan para la corrida siguiente. */
  TENANT_MOVE_CLEANUP_MAX_ATTEMPTS: envNumber({ min: 1, max: 1_000 }).default(
    30,
  ),
  /** Margen hacia atrás de cada ronda delta, para las transacciones que confirmaron tarde. */
  TENANT_MOVE_DELTA_MARGIN_MS: envNumber({ min: 0 }).default(60_000),
  /** Filas cambiadas en una ronda por debajo de las cuales la copia se da por alcanzada. */
  TENANT_MOVE_CAUGHT_UP_ROWS: envNumber({ min: 0 }).default(50),
  /**
   * Con replicación lógica: espera máxima por el candado exclusivo que toma `REPLICA IDENTITY` al publicar o retirar
   * una tabla. Si se agota, la ronda se repite en la llamada siguiente en vez de dejar en cola a las escrituras.
   */
  TENANT_MOVE_LOCK_TIMEOUT_MS: envNumber({ min: 50, max: 5_000 }).default(
    2_000,
  ),
  /** Con replicación lógica: bytes de WAL pendientes por debajo de los cuales la suscripción se da por alcanzada. */
  TENANT_MOVE_CAUGHT_UP_BYTES: envNumber({ min: 0 }).default(1_048_576),
  /**
   * Con replicación lógica: cómo llega el servidor de destino al de origen, si no es por la misma dirección que usa
   * este servicio (por ejemplo, otra red entre regiones).
   */
  TENANT_MOVE_REPLICATION_HOST: z.string().trim().min(1).optional(),
  TENANT_MOVE_REPLICATION_PORT: envNumber({ min: 1, max: 65_535 }).optional(),
});

export type TenantMoveSettings = z.output<typeof tenantMoveConfigSchema>;

export const TenantMoveConfig = new ConfigSection<TenantMoveSettings>(
  'tenant-move',
  tenantMoveConfigSchema,
);
