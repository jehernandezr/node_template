import type { SagaCallContext } from './saga-call-context.js';
import type { SagaStatus } from './saga-status.enum.js';
import type { StepDirection } from './step-direction.enum.js';

/** Campos persistentes de una instancia de saga: lo que guarda y devuelve el `SagaStore`. */
export interface SagaInstanceProps {
  readonly id: string;
  readonly type: string;
  readonly idempotencyKey: string | null;
  readonly status: SagaStatus;
  readonly state: unknown;
  /** Índice del paso que se ejecuta (hacia delante) o se compensa. */
  readonly currentStep: number;
  readonly direction: StepDirection;
  /** Versión de concurrencia optimista; el almacén la sube en cada escritura protegida. */
  readonly version: number;
  /** Token de la corrida que tiene el lease, o `null`. */
  readonly leaseToken: string | null;
  readonly leaseUntil: Date | null;
  readonly nextAttemptAt: Date | null;
  /** Intentos fallidos consecutivos del paso actual. */
  readonly attempts: number;
  /** Cuándo empezó el período de suspensión actual. */
  readonly suspendedSince: Date | null;
  readonly deadlineAt: Date | null;
  readonly lastErrorCode: string | null;
  /**
   * Qué falló además del código, para quien atiende una intervención: el
   * motivo del resultado de la llamada, o el nombre y mensaje del error que
   * lanzó un constructor de paso. Nunca la entrada ni el estado. Se limpia
   * cuando un paso tiene éxito.
   */
  readonly lastErrorDetail: string | null;
  /** Contexto de las llamadas (tenant, actor, traceparent), o `null` si no se dio ninguno. */
  readonly context: SagaCallContext | null;
  /**
   * Huella (`SagaPayload.digest`) del estado inicial. Un arranque idempotente
   * con la misma llave y otra entrada se rechaza.
   */
  readonly inputDigest: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
