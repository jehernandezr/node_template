/** Opciones de `ClaimTable`. */
export interface ClaimTableOptions<R> {
  /** Convierte el resultado a JSON. Por defecto lo guarda tal cual en `jsonb`. */
  readonly serialize?: (result: R) => unknown;
  /** Reconstruye el resultado desde el `jsonb` guardado. */
  readonly deserialize?: (stored: unknown) => R;
  /** La tabla tiene `tenant_id` y guarda ahí el `tenantId` del claim. */
  readonly tenantColumn?: boolean;
}
