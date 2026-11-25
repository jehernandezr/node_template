import type { Provider } from '@nestjs/common';
import type { PlatformRuntimeOptions } from './platform-runtime-options.js';

/** Options of `ServiceHostModule.forService`. */
export interface ServiceHostOptions extends PlatformRuntimeOptions {
  /**
   * Extra providers in a global module, to supply ports that the root module leaves without an
   * adapter (for example a test `Mailer`). They do not replace those already registered by another module.
   */
  readonly overrides?: readonly Provider[];
}
