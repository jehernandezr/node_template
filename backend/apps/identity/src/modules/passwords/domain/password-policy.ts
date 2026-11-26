import { IdentityDefaults } from '../../../shared/constants/identity-defaults.constants.js';

/** Why a password is not accepted. */
export enum PasswordPolicyViolation {
  TooShort = 'too_short',
  TooLong = 'too_long',
  SameAsEmail = 'same_as_email',
}

/**
 * Password policy (NIST SP 800-63B): 12 to 128 characters and different from the email. No composition
 * rules; breached passwords are checked by `BreachedPasswordList`.
 */
export class PasswordPolicy {
  /**
   * Lists the rules a password breaks.
   * @param password Candidate password.
   * @param email Email of the user.
   * @returns The violations; empty when acceptable.
   */
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
