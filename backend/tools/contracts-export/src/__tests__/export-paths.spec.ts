import { ExportPaths } from '../export-paths.js';

describe('ExportPaths', () => {
  const paths = new ExportPaths('/backend');

  describe('resolve', () => {
    it.each<[string, () => string, string]>([
      [
        'the contracts directory',
        () => paths.contractsDir,
        '/backend/libs/contracts',
      ],
      [
        'the topology file',
        () => paths.topology,
        '/backend/infra/terraform/topology.json',
      ],
      [
        'the AsyncAPI file',
        () => paths.asyncApi,
        '/backend/libs/contracts/asyncapi.json',
      ],
      [
        'the export of a service',
        () => paths.contractExportOf('identity'),
        '/backend/libs/contracts/identity/export/contract.json',
      ],
      [
        'the index of a service',
        () => paths.contractIndexOf('identity'),
        '/backend/libs/contracts/identity/src/index.ts',
      ],
    ])('resolves %s under the backend root', (_name, resolve, expected) => {
      const path = resolve();

      expect(path).toBe(expected);
    });
  });
});
