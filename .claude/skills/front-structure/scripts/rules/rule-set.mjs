import { CatchWithoutOnRule } from './catch-without-on-rule.mjs';
import { DatetimeNowRule } from './datetime-now-rule.mjs';
import { FlutterTestImportRule } from './flutter-test-import-rule.mjs';
import { HardcodedColorRule } from './hardcoded-color-rule.mjs';
import { InlineCommentRule } from './inline-comment-rule.mjs';
import { L10nInterpolationRule } from './l10n-interpolation-rule.mjs';
import { LibTestingRule } from './lib-testing-rule.mjs';
import { PhysicalDirectionRule } from './physical-direction-rule.mjs';
import { PrintRule } from './print-rule.mjs';
import { PubspecCaretVersionRule } from './pubspec-caret-version-rule.mjs';
import { TestHelpersFolderRule } from './test-helpers-folder-rule.mjs';
import { TestInLibRule } from './test-in-lib-rule.mjs';
import { TextLiteralRule } from './text-literal-rule.mjs';
import { TopLevelMutableRule } from './top-level-mutable-rule.mjs';
import { WidgetRepositoryRule } from './widget-repository-rule.mjs';

/** The rules the front structure check runs, in the order of the report. */
export class RuleSet {
  /**
   * Builds one instance of every front rule.
   * @returns {import('./rule.mjs').Rule[]} The rules.
   */
  static createDefault() {
    return [
      new TestHelpersFolderRule(),
      new LibTestingRule(),
      new TestInLibRule(),
      new FlutterTestImportRule(),
      new PrintRule(),
      new TopLevelMutableRule(),
      new HardcodedColorRule(),
      new WidgetRepositoryRule(),
      new TextLiteralRule(),
      new PhysicalDirectionRule(),
      new L10nInterpolationRule(),
      new CatchWithoutOnRule(),
      new DatetimeNowRule(),
      new PubspecCaretVersionRule(),
      new InlineCommentRule(),
    ];
  }
}
