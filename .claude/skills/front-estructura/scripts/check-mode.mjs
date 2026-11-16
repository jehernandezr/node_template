// Modos de la CLI. El valor es la bandera tal como se escribe en la línea de comandos.
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
