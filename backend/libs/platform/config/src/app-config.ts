import type { ConfigSection } from './config-section.js';

/**
 * Configuración ya validada e inmutable. Es el único punto de lectura: nadie
 * más toca `process.env`.
 */
export abstract class AppConfig {
  /** Valores de una sección. Falla con `ConfigValidationError` si el entorno no la cumple. */
  abstract get<T>(section: ConfigSection<T>): T;

  /** Valores del esquema propio del servicio (`ConfigModule.forRoot({ schema })`). */
  abstract root<T = unknown>(): T;
}
