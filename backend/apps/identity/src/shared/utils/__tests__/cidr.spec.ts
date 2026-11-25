import { isIpInAnyCidr, isIpInCidr } from '../cidr.js';

describe('CIDR matching', () => {
  it('matches IPv4 addresses inside the block', () => {
    expect(isIpInCidr('10.1.2.3', '10.0.0.0/8')).toBe(true);
    expect(isIpInCidr('192.168.1.1', '10.0.0.0/8')).toBe(false);
  });

  it('matches the block edges of a /31', () => {
    expect(isIpInCidr('203.0.113.0', '203.0.113.0/31')).toBe(true);
    expect(isIpInCidr('203.0.113.1', '203.0.113.0/31')).toBe(true);
    expect(isIpInCidr('203.0.113.2', '203.0.113.0/31')).toBe(false);
  });

  it('matches IPv6 addresses', () => {
    expect(isIpInCidr('2001:db8::1', '2001:db8::/32')).toBe(true);
    expect(isIpInCidr('2001:db9::1', '2001:db8::/32')).toBe(false);
  });

  it('never matches an IPv4 address against an IPv6 block', () => {
    expect(isIpInCidr('10.0.0.1', '::/0')).toBe(false);
  });

  it.each([
    ['10.0.0.0', '10.0.0.0'],
    ['10.0.0.0/33', '10.0.0.0/33'],
    ['10.0.0.0/-1', '10.0.0.0/-1'],
    ['not-an-ip/8', 'not-an-ip/8'],
    ['10.0.0.0/8/9', '10.0.0.0/8/9'],
  ])('returns false for the invalid block %s', (_, cidr) => {
    expect(isIpInCidr('10.0.0.1', cidr)).toBe(false);
  });

  it('returns false for an invalid address', () => {
    expect(isIpInCidr('not-an-ip', '10.0.0.0/8')).toBe(false);
  });

  it('matches when any block contains the address', () => {
    expect(isIpInAnyCidr('172.16.5.5', ['10.0.0.0/8', '172.16.0.0/12'])).toBe(
      true,
    );
    expect(isIpInAnyCidr('8.8.8.8', ['10.0.0.0/8'])).toBe(false);
    expect(isIpInAnyCidr('8.8.8.8', [])).toBe(false);
  });
});
