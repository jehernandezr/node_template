import { OriginPolicy } from '../origin-policy.js';

describe('OriginPolicy', () => {
  const policy = new OriginPolicy([
    'https://App.test/',
    'http://localhost:4200',
  ]);

  it('accepts a request without origin', () => {
    expect(policy.isAllowed(undefined)).toBe(true);
  });

  it('accepts an allowed origin ignoring case and trailing slash', () => {
    expect(policy.isAllowed('https://app.test')).toBe(true);
    expect(policy.isAllowed('HTTPS://APP.TEST')).toBe(true);
    expect(policy.isAllowed('http://localhost:4200')).toBe(true);
  });

  it('rejects another scheme, port or host', () => {
    expect(policy.isAllowed('http://app.test')).toBe(false);
    expect(policy.isAllowed('https://app.test:8443')).toBe(false);
    expect(policy.isAllowed('https://evil.test')).toBe(false);
  });

  it('rejects an origin that does not parse', () => {
    expect(policy.isAllowed('null')).toBe(false);
  });

  it('ignores allowed entries that do not parse', () => {
    expect(new OriginPolicy(['not a url']).isAllowed('https://app.test')).toBe(
      false,
    );
  });
});
