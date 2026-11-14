/**
 * Nombres de las políticas que existían antes de `PolicyName`.
 * @deprecated Usa `PolicyName`: `PolicyName.Cache` y `PolicyName.Database`.
 */
export enum ResiliencePolicyName {
  Database = 'database',
  Cache = 'cache',
}
