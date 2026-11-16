import { FrontPaths } from '../front-paths.mjs';
import { PatternRule } from './pattern-rule.mjs';
import { RuleId } from './rule-id.mjs';

export class WidgetRepositoryRule extends PatternRule {
  constructor() {
    super(
      RuleId.WIDGET_REPOSITORY,
      'la pantalla habla con su controlador, no con widget.repository',
      /\bwidget\.repository\./,
    );
  }

  appliesTo(file) {
    return FrontPaths.isMicrofrontendScreen(file);
  }
}
