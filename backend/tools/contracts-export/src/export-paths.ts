import { join, resolve } from 'node:path';
import {
  ASYNCAPI_PATH,
  CONTRACT_EXPORT_FILE,
  CONTRACTS_DIR,
  DATABASE_CONFIG_PATH,
  EXPORT_DIR,
  OPENAPI_EXPORT_FILE,
  TOPOLOGY_PATH,
} from './export-constants.js';

/** Absolute paths of everything that is read and generated, from the `backend/` root. */
export class ExportPaths {
  constructor(private readonly backendRoot: string) {}

  /** Folder of the exported contracts. */
  get contractsDir(): string {
    return resolve(this.backendRoot, CONTRACTS_DIR);
  }

  /** Path of the messaging topology. */
  get topology(): string {
    return resolve(this.backendRoot, TOPOLOGY_PATH);
  }

  /** Path of the database configuration keys Terraform checks its `DB_*` variables against. */
  get databaseConfig(): string {
    return resolve(this.backendRoot, DATABASE_CONFIG_PATH);
  }

  /** Path of the AsyncAPI document. */
  get asyncApi(): string {
    return resolve(this.backendRoot, ASYNCAPI_PATH);
  }

  /**
   * Path of a service's exported contract.
   * @param service Service name.
   * @returns The path.
   */
  contractExportOf(service: string): string {
    return join(this.contractsDir, service, EXPORT_DIR, CONTRACT_EXPORT_FILE);
  }

  /**
   * Path of a service's OpenAPI document.
   * @param service Service name.
   * @returns The path.
   */
  openApiOf(service: string): string {
    return join(this.contractsDir, service, EXPORT_DIR, OPENAPI_EXPORT_FILE);
  }

  /**
   * Where the exporter loads a service's contract from: the `index.ts` of its contracts library.
   * @param service Service name.
   * @returns The path.
   */
  contractIndexOf(service: string): string {
    return join(this.contractsDir, service, 'src', 'index.ts');
  }
}
