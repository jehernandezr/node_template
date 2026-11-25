import type { SagaSettingsInput } from '../engine/saga-settings-input.js';

/**
 * `SagaModule` options that can come from configuration. All of them are
 * optional: the default owner is a new id and the rest take the values of `SagaSettings`.
 */
export type SagaModuleOptions = Omit<SagaSettingsInput, 'owner'> & {
  /** Identity of this process. By default, a new UUIDv7 at startup. */
  readonly owner?: string;
};
