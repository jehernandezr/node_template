import { PasswordPolicy, PasswordPolicyViolation } from '../password-policy.js';

describe('PasswordPolicy', () => {
  const policy = new PasswordPolicy();

  it('accepts a long passphrase without composition rules', () => {
    expect(
      policy.violations('solo letras minusculas largas', 'ana@example.com'),
    ).toEqual([]);
  });

  it.each([
    ['corta-11ch!', [PasswordPolicyViolation.TooShort]],
    ['x'.repeat(129), [PasswordPolicyViolation.TooLong]],
    ['ANA.LARGA@example.com', [PasswordPolicyViolation.SameAsEmail]],
  ])('rejects %s', (password, violations) => {
    expect(policy.violations(password, 'ana.larga@example.com')).toEqual(
      violations,
    );
  });
});
