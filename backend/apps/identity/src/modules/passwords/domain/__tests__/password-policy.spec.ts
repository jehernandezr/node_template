import { PasswordPolicy, PasswordPolicyViolation } from '../password-policy.js';

describe('PasswordPolicy', () => {
  const policy = new PasswordPolicy();

  it('accepts a long passphrase without composition rules', () => {
    expect(
      policy.violations('only long lowercase letters', 'ana@example.com'),
    ).toEqual([]);
  });

  it.each([
    ['short-11ch!', [PasswordPolicyViolation.TooShort]],
    ['x'.repeat(129), [PasswordPolicyViolation.TooLong]],
    ['ANA.LONG@example.com', [PasswordPolicyViolation.SameAsEmail]],
  ])('rejects %s', (password, violations) => {
    expect(policy.violations(password, 'ana.long@example.com')).toEqual(
      violations,
    );
  });
});
