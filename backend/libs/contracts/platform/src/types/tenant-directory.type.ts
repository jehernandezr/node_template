/**
 * Dónde vive un tenant según el servicio que lo ubicó: su región y los grupos de shards que eligió. Cada servicio
 * traduce cada grupo a su propio shard lógico.
 */
export interface TenantDirectoryEntry {
  tenantId: string;
  region: string;
  /** Grupos de shards, en el orden del directorio de quien lo ubicó. */
  groups: string[];
  /** `true` cuando el tenant es dueño exclusivo de sus shards. */
  dedicated: boolean;
}

/** El tenant cuya fila se retira del directorio de un servicio. */
export interface TenantDirectoryRef {
  tenantId: string;
}

/** Acuse de la ubicación o del retiro de un tenant en el directorio de un servicio. */
export interface TenantDirectoryAck {
  tenantId: string;
}
