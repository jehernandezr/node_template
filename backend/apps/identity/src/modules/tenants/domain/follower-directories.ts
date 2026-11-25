import type { TenantDirectoryEntry } from '@contracts/platform';

/** Los directorios de shards de los demás servicios, que siguen la ubicación que identity elige para cada tenant. */
export abstract class FollowerDirectories {
  /**
   * Anota el tenant en el directorio de cada servicio; si un servicio ya lo tiene, lo deja como está.
   * @throws FollowerDirectoryUnavailableError si un servicio no confirma la ubicación.
   */
  abstract place(entry: TenantDirectoryEntry): Promise<void>;
}
