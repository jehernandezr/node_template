import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WidgetRepositoryRule } from '../widget-repository-rule.mjs';
import { RuleId } from '../rule-id.mjs';

const SCREEN = 'front/microfrontends/tasks/lib/src/screens/a.dart';

describe('WidgetRepositoryRule', () => {
  it('se aplica a las pantallas de un microfrontend, no a sus datos', () => {
    const rule = new WidgetRepositoryRule();
    assert.equal(rule.appliesTo(SCREEN), true);
    assert.equal(
      rule.appliesTo('front/microfrontends/tasks/lib/src/data/a.dart'),
      false,
    );
  });

  it('deja pasar una pantalla que habla con su controlador', () => {
    const rule = new WidgetRepositoryRule();
    const text = ['final a = 1;', 'controller.load();', 'return a;'].join('\n');
    assert.deepEqual(rule.check(SCREEN, text), []);
  });

  it('marca widget.repository. con su línea', () => {
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

  it('ignora una línea de comentario con el patrón', () => {
    const rule = new WidgetRepositoryRule();
    assert.deepEqual(rule.check(SCREEN, '// widget.repository.fetch();'), []);
  });

  it('no marca un repository que no es el del widget', () => {
    const rule = new WidgetRepositoryRule();
    assert.deepEqual(rule.check(SCREEN, 'repository.fetch();'), []);
  });
});
