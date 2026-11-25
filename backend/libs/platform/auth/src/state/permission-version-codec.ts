import type { PermissionVersion } from './permission-version.js';

/** Converts between `PermissionVersion` and the `"<tenant>.<user>"` text of the `pv` claim. Pure utility. */
export class PermissionVersionCodec {
  static format(version: PermissionVersion): string {
    return `${version.tenant}.${version.user}`;
  }

  /** `undefined` if the text is not two non-negative integers separated by a dot. */
  static parse(text: string): PermissionVersion | undefined {
    const match = /^(\d{1,15})\.(\d{1,15})$/.exec(text);
    if (match === null) {
      return undefined;
    }
    return { tenant: Number(match[1]), user: Number(match[2]) };
  }
}
