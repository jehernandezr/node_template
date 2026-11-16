import type { TenantPlacement } from '../../model/tenant-placement.js';
import { InMemoryDirectoryStore } from './in-memory-directory-store.js';

/**
 * Directorio en memoria que cuenta sus lecturas y puede retener la respuesta de
 * una lectura en vuelo. La cantidad de lecturas es un requisito (vuelo único),
 * así que el contador es público en vez de un `jest.fn`.
 */
export class CountingDirectoryStore extends InMemoryDirectoryStore {
  placementReads = 0;
  instanceReads = 0;
  private gate: Promise<void> | undefined;

  /**
   * Desde ahora, cada lectura lee su valor al empezar pero no responde hasta que se
   * llame a la función devuelta; así una prueba simula una lectura lenta que devuelve datos viejos.
   * @returns la función que libera las lecturas retenidas.
   */
  hold(): () => void {
    let release!: () => void;
    this.gate = new Promise<void>((resolve) => {
      release = () => {
        this.gate = undefined;
        resolve();
      };
    });
    return release;
  }

  override async getPlacement(
    tenantId: string,
  ): Promise<TenantPlacement | undefined> {
    this.placementReads += 1;
    const gate = this.gate;
    const value = await super.getPlacement(tenantId);
    await gate;
    return value;
  }

  override async getInstance(
    logicalShard: string,
  ): Promise<string | undefined> {
    this.instanceReads += 1;
    const gate = this.gate;
    const value = await super.getInstance(logicalShard);
    await gate;
    return value;
  }
}
