import { join, resolve } from 'node:path';
import {
  ASYNCAPI_PATH,
  CONTRACT_EXPORT_FILE,
  CONTRACTS_DIR,
  EXPORT_DIR,
  OPENAPI_EXPORT_FILE,
  TOPOLOGY_PATH,
} from './export-constants.js';

/** Absolute paths of everything that is read and generated, from the `backend/` root. */
export class ExportPaths {
  constructor(private readonly backendRoot: string) {}

  get contractsDir(): string {
    return resolve(this.backendRoot, CONTRACTS_DIR);
  }

  get topology(): string {
    return resolve(this.backendRoot, TOPOLOGY_PATH);
  }

  get asyncApi(): string {
    return resolve(this.backendRoot, ASYNCAPI_PATH);
  }

  contractExportOf(service: string): string {
    return join(this.contractsDir, service, EXPORT_DIR, CONTRACT_EXPORT_FILE);
  }

  openApiOf(service: string): string {
    return join(this.contractsDir, service, EXPORT_DIR, OPENAPI_EXPORT_FILE);
  }

  contractIndexOf(service: string): string {
    return join(this.contractsDir, service, 'src', 'index.ts');
  }
}
