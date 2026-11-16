import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PhysicalDirectionRule } from '../physical-direction-rule.mjs';
import { RuleId } from '../rule-id.mjs';

const LIB = 'front/microfrontends/tasks/lib/src/screens/a.dart';

describe('PhysicalDirectionRule', () => {
  it('se aplica al lib de un microfrontend, no a sus pruebas ni a tokens', () => {
    const rule = new PhysicalDirectionRule();
    assert.equal(rule.appliesTo(LIB), true);
    assert.equal(
      rule.appliesTo('front/microfrontends/tasks/lib/src/data/a.dart'),
      true,
    );
    assert.equal(
      rule.appliesTo('front/microfrontends/tasks/test/a_test.dart'),
      false,
    );
    assert.equal(rule.appliesTo('front/packages/tokens/lib/src/a.dart'), false);
  });

  it('deja pasar un texto con direccionalidad y tokens', () => {
    const rule = new PhysicalDirectionRule();
    const text = [
      'final a = 1;',
      'alignment: AlignmentDirectional.centerStart,',
      'return a;',
    ].join('\n');
    assert.deepEqual(rule.check(LIB, text), []);
  });

  it('marca el patrón físico solo en su línea', () => {
    const rule = new PhysicalDirectionRule();
    const text = [
      'final a = 1;',
      'final b = 2;',
      'alignment: Alignment.centerLeft,',
    ].join('\n');
    const [violation, ...rest] = rule.check(LIB, text);
    assert.equal(rest.length, 0);
    assert.equal(violation.ruleId, RuleId.PHYSICAL_DIRECTION);
    assert.equal(violation.file, LIB);
    assert.equal(violation.line, 3);
  });

  it('marca Alignment.centerLeft', () => {
    const rule = new PhysicalDirectionRule();
    assert.equal(rule.check(LIB, 'Alignment.centerLeft').length, 1);
  });

  it('marca Alignment.centerRight', () => {
    const rule = new PhysicalDirectionRule();
    assert.equal(rule.check(LIB, 'Alignment.centerRight').length, 1);
  });

  it('marca EdgeInsets.fromLTRB', () => {
    const rule = new PhysicalDirectionRule();
    assert.equal(rule.check(LIB, 'EdgeInsets.fromLTRB(1, 2, 3, 4)').length, 1);
  });

  it('marca BorderRadius.circular con un número literal', () => {
    const rule = new PhysicalDirectionRule();
    assert.equal(rule.check(LIB, 'BorderRadius.circular(8)').length, 1);
  });

  it('no marca AlignmentDirectional, tokens de radio, EdgeInsets.all ni Alignment.center', () => {
    const rule = new PhysicalDirectionRule();
    assert.deepEqual(rule.check(LIB, 'AlignmentDirectional.centerStart'), []);
    assert.deepEqual(
      rule.check(LIB, 'BorderRadius.circular(AppRadius.md)'),
      [],
    );
    assert.deepEqual(rule.check(LIB, 'EdgeInsets.all(8)'), []);
    assert.deepEqual(rule.check(LIB, 'Alignment.center'), []);
  });

  it('ignora una línea de comentario con el patrón', () => {
    const rule = new PhysicalDirectionRule();
    assert.deepEqual(rule.check(LIB, '// Alignment.centerLeft'), []);
  });
});
