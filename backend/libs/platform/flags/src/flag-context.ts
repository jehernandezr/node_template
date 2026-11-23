/** A quién se le evalúa un flag: el usuario en su tenant activo, el plan del tenant y sus grupos. */
export interface FlagContext {
  readonly tenantId: string;
  readonly userId: string;
  readonly plan?: string;
  readonly groups?: readonly string[];
}
