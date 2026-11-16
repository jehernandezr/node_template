import { BlockList, isIP } from 'node:net';

/**
 * Indica si una IP cae dentro de un bloque CIDR, IPv4 o IPv6. Una IP o un bloque mal formados dan
 * `false`: una entrada inválida nunca concede acceso.
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

/** Verdadero si la IP cae dentro de alguno de los bloques. */
export function isIpInAnyCidr(ip: string, cidrs: readonly string[]): boolean {
  return cidrs.some((cidr) => isIpInCidr(ip, cidr));
}
