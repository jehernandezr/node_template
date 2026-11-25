import { FrontPaths } from '../front-paths.mjs';
import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

export class TestInLibRule extends Rule {
  constructor() {
    super(
      RuleId.TEST_IN_LIB,
      "tests go in the package's test/, mirroring the lib/src folders",
    );
  }

  appliesTo(file) {
    return FrontPaths.isDartLib(file) && file.endsWith('_test.dart');
  }

  check(file, _text) {
    return [this.violation(file)];
  }
}
