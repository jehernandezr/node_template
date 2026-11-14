import { FrontPaths } from '../front-paths.mjs';
import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

export class FlutterTestImportRule extends Rule {
  constructor() {
    super(
      RuleId.FLUTTER_TEST_IMPORT,
      'lib/ no importa flutter_test; los dobles compartidos van en el paquete test_utils',
    );
  }

  appliesTo(file) {
    return (
      FrontPaths.isDartLib(file) &&
      !file.startsWith('front/packages/test_utils/')
    );
  }

  check(file, text) {
    return /import\s+'package:flutter_test\//.test(text)
      ? [this.violation(file)]
      : [];
  }
}
