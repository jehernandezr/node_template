import type { ServiceContract } from '@contracts/platform';
import { ContractRegistry } from './contract-registry.js';
import { ExportError } from './export-error.js';
import type { ExportPaths } from './export-paths.js';
import type { FileSystem } from './file-system.js';
import type { ModuleLoader } from './module-loader.js';

/** Claves que todo contrato debe traer como objeto, además de `service` y `description`. */
const CONTRACT_MAPS = [
  'enums',
  'constants',
  'schemas',
  'routes',
  'operations',
  'events',
  'commands',
  'topics',
  'queues',
  'errors',
] as const;

/**
 * Encuentra los contratos leyendo `libs/contracts/<servicio>/src/index.ts`:
 * agregar una carpeta basta para que se exporte, sin registro manual.
 */
export class ContractsDiscovery extends ContractRegistry {
  constructor(
    private readonly paths: ExportPaths,
    private readonly fileSystem: FileSystem,
    private readonly moduleLoader: ModuleLoader,
  ) {
    super();
  }

  async load(): Promise<readonly ServiceContract[]> {
    const names = await this.fileSystem.listDirectories(
      this.paths.contractsDir,
    );
    const contracts: ServiceContract[] = [];
    for (const name of names) {
      const index = this.paths.contractIndexOf(name);
      if (!(await this.fileSystem.exists(index))) {
        throw ExportError.forService(
          name,
          'falta src/index.ts en su carpeta de libs/contracts',
        );
      }
      const exported = await this.moduleLoader.load(index);
      const found = Object.values(exported).filter(
        (value): value is ServiceContract =>
          this.isServiceContract(value) && value.service === name,
      );
      if (found.length !== 1) {
        throw ExportError.forService(
          name,
          'su src/index.ts debe exportar exactamente un contrato con service igual a la carpeta',
        );
      }
      contracts.push(found[0]);
    }
    return contracts;
  }

  private isServiceContract(value: unknown): value is ServiceContract {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate['service'] === 'string' &&
      typeof candidate['description'] === 'string' &&
      CONTRACT_MAPS.every(
        (key) => typeof candidate[key] === 'object' && candidate[key] !== null,
      ) &&
      Array.isArray(candidate['sends'])
    );
  }
}
