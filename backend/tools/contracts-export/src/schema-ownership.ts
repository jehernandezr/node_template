import type { z } from 'zod';
import type { ServiceContract } from '@contracts/platform';
import { ExportError } from './export-error.js';

export interface SchemaOwner {
  readonly service: string;
  readonly name: string;
}

/** Determines which contract each named schema belongs to. */
export class SchemaOwnership {
  /** Fails if the same schema is registered under two names. */
  of(contracts: readonly ServiceContract[]): Map<z.ZodType, SchemaOwner> {
    const owners = new Map<z.ZodType, SchemaOwner>();
    for (const contract of contracts) {
      for (const [name, schema] of Object.entries(contract.schemas)) {
        const previous = owners.get(schema);
        if (previous) {
          throw ExportError.forService(
            contract.service,
            `schema ${name} is already registered as ${previous.service}.${name}`,
          );
        }
        owners.set(schema, { service: contract.service, name });
      }
    }
    return owners;
  }
}
