import type { Provider } from '@nestjs/common';
import type { PlatformRuntimeOptions } from './platform-runtime-options.js';

/** Opciones de `ServiceHostModule.forService`. */
export interface ServiceHostOptions extends PlatformRuntimeOptions {
  /**
   * Providers extra en un módulo global, para entregar puertos que el módulo raíz deja sin
   * adaptador (por ejemplo un `Mailer` de pruebas). No reemplazan los que ya registre otro módulo.
   */
  readonly overrides?: readonly Provider[];
}
