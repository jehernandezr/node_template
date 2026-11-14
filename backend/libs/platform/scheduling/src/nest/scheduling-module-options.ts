import type { Abstract, Type } from '@nestjs/common';
import type { JobLock } from '@platform/kernel';
import type { LoggerPort, MetricsPort } from '@platform/observability';
import type { SchedulingMode } from '../scheduling-mode.enum.js';

/**
 * Opciones de `SchedulingModule` que pueden salir de la configuración, así que
 * `forRootAsync` las arma con una fábrica.
 */
export interface SchedulingModuleOptions {
  /** Por defecto `SchedulingMode.InProcess`. */
  readonly mode?: SchedulingMode;
  /** Tiempo que `stop` espera a los jobs en curso al apagar. Por defecto 10 000 ms. */
  readonly shutdownGraceMs?: number;
}

/**
 * Adaptadores de `SchedulingModule`. Se pasan como tipo o token, no como
 * instancia, y se fijan al componer el módulo: van igual en `forRoot` y en `forRootAsync`.
 */
export interface SchedulingModuleExtras {
  /** Obligatorio: implementación de `LoggerPort` que provee la observabilidad del servicio. */
  readonly logger?: Type<LoggerPort> | Abstract<LoggerPort>;
  /** Por defecto `InProcessJobLock`; con varios procesos, `ValkeyJobLock`. */
  readonly lock?: Type<JobLock> | Abstract<JobLock>;
  /** Implementación de `MetricsPort`. Por defecto `NoopMetrics`. */
  readonly metrics?: Type<MetricsPort> | Abstract<MetricsPort>;
}
