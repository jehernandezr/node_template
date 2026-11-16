import type { SagaSettingsInput } from '../engine/saga-settings-input.js';

/**
 * Opciones de `SagaModule` que pueden salir de la configuración. Todas son
 * opcionales: el dueño por defecto es un id nuevo y el resto toma los valores de `SagaSettings`.
 */
export type SagaModuleOptions = Omit<SagaSettingsInput, 'owner'> & {
  /** Identidad de este proceso. Por defecto, un UUIDv7 nuevo al arrancar. */
  readonly owner?: string;
};
