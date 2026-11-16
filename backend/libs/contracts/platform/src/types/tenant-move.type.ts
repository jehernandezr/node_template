/** Traslado de un tenant: lo que cada servicio necesita para copiar, verificar o cancelar. */
export interface TenantMoveRef {
  moveId: string;
  tenantId: string;
  /** Grupo de shards de destino. */
  targetGroup: string;
  /** Región de destino. */
  targetRegion: string;
}

/** Avance de la copia de una tabla. */
export interface TenantMoveTableProgress {
  table: string;
  copiedRows: number;
  pendingRows: number;
}

/** Resultado de una ronda de copia. `caughtUp` es true cuando el atraso bajó del umbral. */
export interface TenantMoveProgress {
  tables: TenantMoveTableProgress[];
  caughtUp: boolean;
}

/** Comparación de una tabla entre el origen y el destino. */
export interface TenantMoveTableCheck {
  table: string;
  sourceRows: number;
  targetRows: number;
  sourceChecksum: string;
  targetChecksum: string;
}

/** Resultado de la última ronda y la verificación. */
export interface TenantMoveVerification {
  verified: boolean;
  tables: TenantMoveTableCheck[];
}

/** Acuse de una cancelación o una limpieza. */
export interface TenantMoveAck {
  moveId: string;
}
