import { FrontPaths } from '../front-paths.mjs';
import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

/** Rejects tests placed under `lib/`: they go in the `test/` folder of the package, mirroring `lib/src`. */
export class TestInLibRule extends Rule {
  constructor() {
    super(
      RuleId.TEST_IN_LIB,
      "tests go in the package's test/, mirroring the lib/src folders",
    );
  }

  /** @override */
  appliesTo(file) {
    return FrontPaths.isDartLib(file) && file.endsWith('_test.dart');
  }

  /** @override */
  check(file, _text) {
    return [this.violation(file)];
  }
}
