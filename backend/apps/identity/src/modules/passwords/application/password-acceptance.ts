import { Injectable } from '@nestjs/common';
import { IdentityErrorCode } from '@contracts/identity';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { BreachedPasswordList } from '../domain/breached-password-list.js';
import { PasswordPolicy } from '../domain/password-policy.js';

/** Checks a new password against the policy and the breached list. */
@Injectable()
export class PasswordAcceptance {
  private readonly policy = new PasswordPolicy();

  constructor(private readonly breached: BreachedPasswordList) {}

  /**
   * @throws IdentityError `IDENTITY.PASSWORD.POLICY_VIOLATION` with `details.violations`, or
   * `IDENTITY.PASSWORD.BREACHED`.
   */
  async assert(password: string, email: string): Promise<void> {
    const violations = this.policy.violations(password, email);
    if (violations.length > 0) {
      throw new IdentityError(
        IdentityErrorCode.PasswordPolicyViolation,
        'The password does not follow the policy',
        { violations },
      );
    }
    if (await this.breached.contains(password)) {
      throw new IdentityError(IdentityErrorCode.PasswordBreached);
    }
  }
}
