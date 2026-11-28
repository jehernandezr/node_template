import type { SecretSource } from '@platform/config';
import type { ServiceBootstrapOptions } from '../bootstrap/service-bootstrap-options.js';

/** Options of `LambdaBootstrap.http`. */
export interface LambdaBootstrapOptions extends ServiceBootstrapOptions {
  /**
   * Reads the secrets that `SECRETS_MAP` names. Secrets Manager in the region of `AWS_REGION` by default, with a
   * client the bootstrap closes once they are read.
   */
  readonly secrets?: SecretSource;
}
