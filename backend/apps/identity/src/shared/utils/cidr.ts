import { BlockList, isIP } from 'node:net';

/**
 * Returns whether an IP falls within a CIDR block, IPv4 or IPv6. A malformed IP or block gives
 * `false`: an invalid input never grants access.
 */
export function isIpInCidr(ip: string, cidr: string): boolean {
  const parts = cidr.split('/');
  if (parts.length !== 2) {
    return false;
  }
  const [network, prefixText] = parts as [string, string];
  const family = isIP(network);
  if (family === 0 || isIP(ip) !== family || !/^\d+$/.test(prefixText)) {
    return false;
  }
  const prefix = Number(prefixText);
  if (prefix > (family === 4 ? 32 : 128)) {
    return false;
  }
  const blockType = family === 4 ? 'ipv4' : 'ipv6';
  const list = new BlockList();
  list.addSubnet(network, prefix, blockType);
  return list.check(ip, blockType);
}

/** Whether the IP falls within any of the blocks. */
export function isIpInAnyCidr(ip: string, cidrs: readonly string[]): boolean {
  return cidrs.some((cidr) => isIpInCidr(ip, cidr));
}
