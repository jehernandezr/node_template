import { FrontPaths } from '../front-paths.mjs';
import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

/** Rejects importing `flutter_test` from library code other than the `test_utils` package. */
export class FlutterTestImportRule extends Rule {
  constructor() {
    super(
      RuleId.FLUTTER_TEST_IMPORT,
      'lib/ does not import flutter_test; shared test doubles go in the test_utils package',
    );
  }

  /** @override */
  appliesTo(file) {
    return (
      FrontPaths.isDartLib(file) &&
      !file.startsWith('front/packages/test_utils/')
    );
  }

  /** @override */
  check(file, text) {
    return /import\s+'package:flutter_test\//.test(text)
      ? [this.violation(file)]
      : [];
  }
}
