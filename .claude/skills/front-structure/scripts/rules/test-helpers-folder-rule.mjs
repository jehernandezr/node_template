import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

/** Rejects test helpers outside `test/utils/`, where the tests of a package share them. */
export class TestHelpersFolderRule extends Rule {
  constructor() {
    super(
      RuleId.TEST_HELPERS_FOLDER,
      "what a package's tests share goes in test/utils/",
    );
  }

  /** @override */
  appliesTo(file) {
    return /^front\/.+\/test\/(.+\/)?(support|testing|helpers)\//.test(file);
  }

  /** @override */
  check(file, _text) {
    return [this.violation(file)];
  }
}
