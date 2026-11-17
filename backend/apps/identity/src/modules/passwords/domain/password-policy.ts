import { IdentityDefaults } from '../../../shared/constants/identity-defaults.constants.js';

/** Por qué una contraseña no se acepta. */
export enum PasswordPolicyViolation {
  TooShort = 'too_short',
  TooLong = 'too_long',
  SameAsEmail = 'same_as_email',
}

/**
 * Política de contraseñas (NIST SP 800-63B): de 12 a 128 caracteres y distinta del email. Sin reglas de
 * composición; las contraseñas filtradas las revisa `BreachedPasswordList`.
 */
export class PasswordPolicy {
  violations(password: string, email: string): PasswordPolicyViolation[] {
    const length = [...password].length;
    const violations: PasswordPolicyViolation[] = [];
    if (length < IdentityDefaults.passwordMinLength) {
      violations.push(PasswordPolicyViolation.TooShort);
    }
    if (length > IdentityDefaults.passwordMaxLength) {
      violations.push(PasswordPolicyViolation.TooLong);
    }
    if (password.trim().toLowerCase() === email.trim().toLowerCase()) {
      violations.push(PasswordPolicyViolation.SameAsEmail);
    }
    return violations;
  }
}
