// CLI modes. The value is the flag as written on the command line.
export class CheckMode {
  static CHANGED = '--changed';
  static ALL = '--all';

  static values() {
    return [CheckMode.CHANGED, CheckMode.ALL];
  }

  static isValid(flag) {
    return CheckMode.values().includes(flag);
  }
}
