import { FrontPaths } from '../front-paths.mjs';
import { PatternRule } from './pattern-rule.mjs';
import { RuleId } from './rule-id.mjs';

/** Rejects a screen that reaches `widget.repository`: the screen talks to its controller. */
export class WidgetRepositoryRule extends PatternRule {
  constructor() {
    super(
      RuleId.WIDGET_REPOSITORY,
      'the screen talks to its controller, not to widget.repository',
      /\bwidget\.repository\./,
    );
  }

  /** @override */
  appliesTo(file) {
    return FrontPaths.isMicrofrontendScreen(file);
  }
}
