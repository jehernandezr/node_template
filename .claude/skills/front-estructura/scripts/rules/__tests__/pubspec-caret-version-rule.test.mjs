import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PubspecCaretVersionRule } from '../pubspec-caret-version-rule.mjs';
import { RuleId } from '../rule-id.mjs';

describe('PubspecCaretVersionRule', () => {
  it('se aplica a los pubspec de los miembros del workspace', () => {
    const rule = new PubspecCaretVersionRule();
    assert.equal(rule.appliesTo('front/packages/ui/pubspec.yaml'), true);
    assert.equal(
      rule.appliesTo('front/microfrontends/tasks/pubspec.yaml'),
      true,
    );
    assert.equal(rule.appliesTo('front/pubspec.yaml'), false);
    assert.equal(rule.appliesTo('front/packages/ui/lib/a.dart'), false);
  });

  it('marca una dependencia con ^', () => {
    const rule = new PubspecCaretVersionRule();
    const file = 'front/packages/ui/pubspec.yaml';
    const text = [
      'name: ui',
      'environment:',
      '  sdk: ^3.14.0',
      'dependencies:',
      '  go_router: ^18.1.4',
    ].join('\n');
    const [violation, ...rest] = rule.check(file, text);
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.PUBSPEC_CARET_VERSION);
    assert.equal(violation.file, file);
    assert.equal(violation.line, 5);
  });

  it('marca una dependencia con ^ entre comillas', () => {
    const rule = new PubspecCaretVersionRule();
    const text = "dependencies:\n  intl: '^0.20.3'";
    const [violation, ...rest] = rule.check(
      'front/packages/ui/pubspec.yaml',
      text,
    );
    assert.equal(rest.length, 0);
    assert.equal(violation.line, 2);
  });

  it('acepta una versión exacta', () => {
    const rule = new PubspecCaretVersionRule();
    const text = 'dependencies:\n  go_router: 18.1.4';
    assert.deepEqual(rule.check('front/packages/ui/pubspec.yaml', text), []);
  });

  it('acepta el ^ del SDK y los rangos sin ^', () => {
    const rule = new PubspecCaretVersionRule();
    const text = [
      'environment:',
      '  sdk: ^3.14.0',
      'dependencies:',
      '  flutter: ">=1.17.0"',
    ].join('\n');
    assert.deepEqual(rule.check('front/packages/ui/pubspec.yaml', text), []);
  });

  it('ignora una dependencia comentada', () => {
    const rule = new PubspecCaretVersionRule();
    const text = 'dependencies:\n  # go_router: ^1.0.0';
    assert.deepEqual(rule.check('front/packages/ui/pubspec.yaml', text), []);
  });

  it('acepta un ^ en la columna 0', () => {
    const rule = new PubspecCaretVersionRule();
    const text = 'version: ^1.0.0';
    assert.deepEqual(rule.check('front/packages/ui/pubspec.yaml', text), []);
  });
});
