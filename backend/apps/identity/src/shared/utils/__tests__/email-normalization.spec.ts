import { normalizeEmail } from '../email-normalization.js';

describe('normalizeEmail', () => {
  it('trims and lowercases the address', () => {
    expect(normalizeEmail('  Ana@Example.COM ')).toBe('ana@example.com');
  });

  it('folds compatibility characters with NFKC', () => {
    expect(normalizeEmail('ＡＮＡ@example.com')).toBe('ana@example.com');
  });

  it('gives the same account for two spellings', () => {
    expect(normalizeEmail('ana@example.com')).toBe(
      normalizeEmail('ANA@example.com '),
    );
  });
});
