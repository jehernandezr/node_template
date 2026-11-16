import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

export class TestHelpersFolderRule extends Rule {
  constructor() {
    super(
      RuleId.TEST_HELPERS_FOLDER,
      'lo compartido por las pruebas de un paquete va en test/utils/',
    );
  }

  appliesTo(file) {
    return /^front\/.+\/test\/(.+\/)?(support|testing|helpers)\//.test(file);
  }

  check(file, _text) {
    return [this.violation(file)];
  }
}
