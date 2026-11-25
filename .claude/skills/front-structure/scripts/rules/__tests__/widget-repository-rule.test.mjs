import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WidgetRepositoryRule } from '../widget-repository-rule.mjs';
import { RuleId } from '../rule-id.mjs';

const SCREEN = 'front/microfrontends/tasks/lib/src/screens/a.dart';

describe('WidgetRepositoryRule', () => {
  it("applies to a microfrontend's screens, not to its data", () => {
    const rule = new WidgetRepositoryRule();
    assert.equal(rule.appliesTo(SCREEN), true);
    assert.equal(
      rule.appliesTo('front/microfrontends/tasks/lib/src/data/a.dart'),
      false,
    );
  });

  it('lets a screen that talks to its controller through', () => {
    const rule = new WidgetRepositoryRule();
    const text = ['final a = 1;', 'controller.load();', 'return a;'].join('\n');
    assert.deepEqual(rule.check(SCREEN, text), []);
  });

  it('flags widget.repository. with its line', () => {
    const rule = new WidgetRepositoryRule();
    const text = [
      'final a = 1;',
      'final b = 2;',
      'final r = widget.repository.fetch();',
    ].join('\n');
    const [violation, ...rest] = rule.check(SCREEN, text);
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.WIDGET_REPOSITORY);
    assert.equal(violation.file, SCREEN);
    assert.equal(violation.line, 3);
  });

  it('ignores a comment line with the pattern', () => {
    const rule = new WidgetRepositoryRule();
    assert.deepEqual(rule.check(SCREEN, '// widget.repository.fetch();'), []);
  });

  it('does not flag a repository that is not the widget one', () => {
    const rule = new WidgetRepositoryRule();
    assert.deepEqual(rule.check(SCREEN, 'repository.fetch();'), []);
  });
});
