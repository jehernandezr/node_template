import type { PermissionVersion } from './permission-version.js';

/** Converts between `PermissionVersion` and the `"<tenant>.<user>"` text of the `pv` claim. Pure utility. */
export class PermissionVersionCodec {
  /**
   * Formats a permissions version as `<tenant>.<user>`.
   * @param version Version to format.
   * @returns The text.
   */
  static format(version: PermissionVersion): string {
    return `${version.tenant}.${version.user}`;
  }

  /**
   * `undefined` if the text is not two non-negative integers separated by a dot.
   * @param text Text to parse.
   * @returns The version, or `undefined`.
   */
  static parse(text: string): PermissionVersion | undefined {
    const match = /^(\d{1,15})\.(\d{1,15})$/.exec(text);
    if (match === null) {
      return undefined;
    }
    return { tenant: Number(match[1]), user: Number(match[2]) };
  }
}
