/**
 * CLI modes. The value is the flag as written on the command line.
 */
export class CheckMode {
  static CHANGED = '--changed';
  static ALL = '--all';
  static STAGED = '--staged';

  /**
   * Lists the flags the CLI accepts, for its usage message.
   * @returns {string[]} The flags.
   */
  static values() {
    return [CheckMode.CHANGED, CheckMode.ALL, CheckMode.STAGED];
  }

  /**
   * Tells whether a command-line flag names a mode, so a typo never falls back to another mode.
   * @param {string} flag Flag as written on the command line.
   * @returns {boolean} Whether it is a mode.
   */
  static isValid(flag) {
    return CheckMode.values().includes(flag);
  }
}
