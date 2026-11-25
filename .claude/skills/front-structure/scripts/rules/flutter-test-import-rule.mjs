import { FrontPaths } from '../front-paths.mjs';
import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

export class FlutterTestImportRule extends Rule {
  constructor() {
    super(
      RuleId.FLUTTER_TEST_IMPORT,
      'lib/ does not import flutter_test; shared test doubles go in the test_utils package',
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
