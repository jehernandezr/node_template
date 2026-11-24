/** Lo que `api-keys` ofrece a los otros módulos. */
export abstract class ApiKeysFacade {
  /** Apunta a `region` el índice de prefijos del tenant después de trasladarlo. Idempotente. */
  abstract relocateTenant(tenantId: string, region: string): Promise<void>;
}
