import type { Type } from '@nestjs/common';
import type { OperationDefinition } from '@contracts/platform';
import type { PurgeableStore } from '@platform/kernel';
import type { FinalOutcome, IdempotencyStore } from '@platform/primitives';
import type { InternalTransportKind } from './internal-transport-kind.enum.js';

/** Cómo se llega por HTTP a otros servicios y cómo se firman y verifican las llamadas. */
export interface InternalApiHttpOptions {
  /** URL base por nombre de servicio: el primer segmento del id de sus operaciones. */
  readonly baseUrls: Readonly<Record<string, string>>;
  /** Secreto HMAC compartido entre servicios. Llega de la configuración validada, nunca escrito en el código. */
  readonly secret: string;
  /** Ventana de validez de una firma. Por defecto 60 000 ms. */
  readonly signatureWindowMs?: number;
}

/**
 * Opciones de `InternalApiModule` que pueden salir de la configuración, así
 * que `forRootAsync` las arma con una fábrica.
 */
export interface InternalApiModuleOptions {
  /** Operaciones que este servicio publica: cada una debe tener un handler. */
  readonly operations: readonly OperationDefinition[];
  /** Operaciones de otros servicios que este llama. Se suman al catálogo del cliente. */
  readonly remoteOperations?: readonly OperationDefinition[];
  /** Obligatorio con `InternalTransportKind.Http`, y para que el controller autentique las llamadas entrantes. */
  readonly http?: InternalApiHttpOptions;
  /** Tope de la entrada y la salida serializadas. Por defecto 256 KiB. */
  readonly maxPayloadBytes?: number;
  /** Margen del lease de idempotencia sobre el plazo de la llamada. */
  readonly leaseMarginMs?: number;
  /** Lease mínimo de idempotencia. */
  readonly minLeaseMs?: number;
  /** Tope del presupuesto por defecto de una llamada. Por defecto 25 000 ms. */
  readonly maxCallBudgetMs?: number;
  /** Cuánto se conserva un resultado guardado antes de que el job de retención lo borre. */
  readonly retentionMs?: number;
}

/**
 * Adaptadores de `InternalApiModule`. Se pasan como tipo, no como instancia,
 * y se fijan al componer el módulo: van igual en `forRoot` y en `forRootAsync`.
 */
export interface InternalApiModuleExtras {
  /** Obligatorio. `Http` para llamar a otros procesos, `InProcess` para el modo local. */
  readonly transport?: InternalTransportKind;
  /**
   * Obligatorio. Almacén de idempotencia del router; en producción, el de
   * `adapters-postgres`, que escribe en la misma transacción que el handler.
   */
  readonly processedStore?: Type<IdempotencyStore<FinalOutcome<unknown>>>;
  /**
   * Almacén que el job de retención purga. Sin él, no se registra el job. Suele
   * ser la misma clase que `processedStore`.
   */
  readonly purgeableStore?: Type<PurgeableStore>;
  /** `false` para importar el módulo en cada módulo que lo use. Por defecto, global. */
  readonly isGlobal?: boolean;
}

/**
 * Los extras ya validados por `InternalApiModule`: `transport` y `processedStore`
 * dejan de ser opcionales. Es lo que reciben los proveedores.
 */
export type ResolvedInternalApiExtras = InternalApiModuleExtras &
  Required<Pick<InternalApiModuleExtras, 'transport' | 'processedStore'>>;
