import { Rule } from './rule.mjs';
import { RuleId } from './rule-id.mjs';

export class TestHelpersFolderRule extends Rule {
  constructor() {
    super(
      RuleId.TEST_HELPERS_FOLDER,
      "what a package's tests share goes in test/utils/",
    );
  }

  appliesTo(file) {
    return /^front\/.+\/test\/(.+\/)?(support|testing|helpers)\//.test(file);
  }

  check(file, _text) {
    return [this.violation(file)];
  }
}
