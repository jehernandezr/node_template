import type { PermissionVersion } from './permission-version.js';

/** Convierte entre `PermissionVersion` y el texto `"<tenant>.<usuario>"` del claim `pv`. Utilidad pura. */
export class PermissionVersionCodec {
  static format(version: PermissionVersion): string {
    return `${version.tenant}.${version.user}`;
  }

  /** `undefined` si el texto no son dos enteros no negativos separados por un punto. */
  static parse(text: string): PermissionVersion | undefined {
    const match = /^(\d{1,15})\.(\d{1,15})$/.exec(text);
    if (match === null) {
      return undefined;
    }
    return { tenant: Number(match[1]), user: Number(match[2]) };
  }
}
