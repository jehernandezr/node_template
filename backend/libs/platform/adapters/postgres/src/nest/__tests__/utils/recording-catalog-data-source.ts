import type { ReplicationMode } from 'typeorm';

/**
 * Ocupa el lugar de `CatalogDataSource`: su `DataSource` no tiene filas y guarda el modo de réplica de cada
 * `QueryRunner` que se le pide, para ver si una lectura fue al primario o a la réplica.
 */
export class RecordingCatalogDataSource {
  readonly modes: ReplicationMode[] = [];

  get(): Promise<unknown> {
    return Promise.resolve({
      createQueryRunner: (mode: ReplicationMode) => {
        this.modes.push(mode);
        return {
          manager: { findOneBy: () => Promise.resolve(null) },
          release: () => Promise.resolve(),
        };
      },
    });
  }
}
