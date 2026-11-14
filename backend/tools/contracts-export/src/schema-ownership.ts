import type { z } from 'zod';
import type { ServiceContract } from '@contracts/platform';
import { ExportError } from './export-error.js';

export interface SchemaOwner {
  readonly service: string;
  readonly name: string;
}

/** Averigua a qué contrato pertenece cada esquema con nombre. */
export class SchemaOwnership {
  /** Falla si un mismo esquema está registrado con dos nombres. */
  of(contracts: readonly ServiceContract[]): Map<z.ZodType, SchemaOwner> {
    const owners = new Map<z.ZodType, SchemaOwner>();
    for (const contract of contracts) {
      for (const [name, schema] of Object.entries(contract.schemas)) {
        const previous = owners.get(schema);
        if (previous) {
          throw ExportError.forService(
            contract.service,
            `el esquema ${name} ya está registrado como ${previous.service}.${name}`,
          );
        }
        owners.set(schema, { service: contract.service, name });
      }
    }
    return owners;
  }
}
