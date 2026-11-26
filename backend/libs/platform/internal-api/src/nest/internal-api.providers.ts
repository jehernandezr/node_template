import type { Abstract, Provider, Type } from '@nestjs/common';
import { InternalClient } from '../client/internal-client.js';
import { ContractRegistry } from '../contract/contract-registry.js';
import { InternalRouter } from '../server/internal-router.js';
import { Transport } from '../transport/transport.js';
import { InternalApiClientProviders } from './internal-api-client.providers.js';
import { InternalApiContractProviders } from './internal-api-contract.providers.js';
import type { ResolvedInternalApiExtras } from './internal-api-module-options.js';
import { InternalApiServerProviders } from './internal-api-server.providers.js';

/** Providers of the internal API module and what it exports. */
export class InternalApiProviders {
  /**
   * Builds the providers of the internal API.
   * @param extras Store and signer adapters.
   * @returns The providers.
   */
  static build(extras: ResolvedInternalApiExtras): Provider[] {
    return [
      ...InternalApiContractProviders.build(),
      ...InternalApiServerProviders.build(extras),
      ...InternalApiClientProviders.build(extras.transport),
    ];
  }

  /**
   * Lists the tokens the internal API exports.
   * @returns The tokens.
   */
  static exports(): Array<Abstract<unknown> | Type<unknown>> {
    return [InternalClient, InternalRouter, Transport, ContractRegistry];
  }
}
