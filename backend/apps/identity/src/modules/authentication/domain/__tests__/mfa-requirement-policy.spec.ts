import { MfaRequirementPolicy } from '../mfa-requirement-policy.js';

describe('MfaRequirementPolicy', () => {
  const policy = new MfaRequirementPolicy();
  const trusted = {
    deviceRecognized: true,
    privileged: false,
    protectedMode: false,
  };

  it('lets a recognized device of a regular account in with the password', () => {
    expect(policy.requiresSecondFactor(trusted)).toBe(false);
  });

  it.each([
    ['an unknown device', { ...trusted, deviceRecognized: false }],
    ['an administrator or platform role', { ...trusted, privileged: true }],
    ['an account in protected mode', { ...trusted, protectedMode: true }],
  ])('asks for a second factor from %s', (_name, facts) => {
    expect(policy.requiresSecondFactor(facts)).toBe(true);
  });
});
