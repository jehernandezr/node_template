/** Lo que se sabe de un inicio de sesión con la contraseña ya verificada. */
export interface MfaRequirementFacts {
  /** El dispositivo de la petición está registrado para el usuario. */
  readonly deviceRecognized: boolean;
  /** Administra su tenant predeterminado o tiene roles de plataforma. */
  readonly privileged: boolean;
  /** La cuenta está en modo protegido por fallos desde varios orígenes. */
  readonly protectedMode: boolean;
}

/** Decide si un inicio de sesión necesita segundo factor. */
export class MfaRequirementPolicy {
  requiresSecondFactor(facts: MfaRequirementFacts): boolean {
    return !facts.deviceRecognized || facts.privileged || facts.protectedMode;
  }
}
