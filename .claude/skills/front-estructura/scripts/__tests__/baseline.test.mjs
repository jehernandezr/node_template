import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { Baseline } from '../baseline.mjs';
import { Violation } from '../violation.mjs';
import { RuleId } from '../rules/rule-id.mjs';

describe('Baseline', () => {
  const temp = { dir: '' };

  before(() => {
    temp.dir = mkdtempSync(join(tmpdir(), 'baseline-'));
  });

  after(() => {
    rmSync(temp.dir, { recursive: true, force: true });
  });

  it('carga una línea base vacía cuando el archivo no existe', () => {
    const baseline = Baseline.load(join(temp.dir, 'no-existe.json'));
    assert.equal(baseline.counts.size, 0);
  });

  it('conserva las cuentas al guardar y volver a cargar', () => {
    const violations = [
      new Violation('front/a.dart', RuleId.HARDCODED_COLOR, 'm', 1),
      new Violation('front/a.dart', RuleId.HARDCODED_COLOR, 'm', 2),
      new Violation('front/b.dart', RuleId.PRINT_CALL, 'm', 1),
    ];
    const path = join(temp.dir, 'roundtrip.json');
    const saved = Baseline.fromViolations(violations);
    saved.save(path);
    const loaded = Baseline.load(path);
    assert.equal(
      loaded.count('front/a.dart', RuleId.HARDCODED_COLOR),
      saved.count('front/a.dart', RuleId.HARDCODED_COLOR),
    );
    assert.equal(
      loaded.count('front/b.dart', RuleId.PRINT_CALL),
      saved.count('front/b.dart', RuleId.PRINT_CALL),
    );
    assert.equal(loaded.count('front/a.dart', RuleId.PRINT_CALL), 0);
  });

  it('guarda el JSON con archivos y reglas en orden alfabético', () => {
    const violations = [
      new Violation('front/b.dart', RuleId.PRINT_CALL, 'm', 1),
      new Violation('front/a.dart', RuleId.HARDCODED_COLOR, 'm', 1),
      new Violation('front/a.dart', RuleId.CATCH_WITHOUT_ON, 'm', 1),
      new Violation('front/a.dart', RuleId.HARDCODED_COLOR, 'm', 2),
    ];
    const path = join(temp.dir, 'exact.json');
    Baseline.fromViolations(violations).save(path);
    assert.equal(
      readFileSync(path, 'utf8'),
      '{\n  "version": 1,\n  "violations": {\n    "front/a.dart": {\n      "catch-without-on": 1,\n      "hardcoded-color": 2\n    },\n    "front/b.dart": {\n      "print-call": 1\n    }\n  }\n}\n',
    );
  });

  it('crea las carpetas que faltan al guardar', () => {
    const path = join(temp.dir, 'x', 'y', 'base.json');
    Baseline.empty().save(path);
    assert.equal(existsSync(path), true);
  });

  it('rechaza una línea base con otra versión', () => {
    const path = join(temp.dir, 'version-2.json');
    writeFileSync(path, '{"version":2,"violations":{}}');
    assert.throws(() => Baseline.load(path));
  });

  it('no devuelve violaciones nuevas cuando la cuenta real es igual a la línea base', () => {
    const violation = new Violation(
      'front/a.dart',
      RuleId.HARDCODED_COLOR,
      'm',
      1,
    );
    const baseline = Baseline.fromViolations([violation]);
    const { fresh, stale } = baseline.filterNew([violation]);
    assert.deepEqual(fresh, []);
    assert.deepEqual(stale, []);
  });

  it('devuelve todo el grupo cuando la cuenta real supera la línea base', () => {
    const first = new Violation('front/a.dart', RuleId.HARDCODED_COLOR, 'm', 1);
    const second = new Violation(
      'front/a.dart',
      RuleId.HARDCODED_COLOR,
      'm',
      2,
    );
    const baseline = Baseline.fromViolations([first]);
    const { fresh } = baseline.filterNew([first, second]);
    assert.deepEqual(
      fresh.map((v) => v.line),
      [1, 2],
    );
  });

  it('trata un par ausente de la línea base como cuenta cero', () => {
    const violation = new Violation(
      'front/a.dart',
      RuleId.HARDCODED_COLOR,
      'm',
      1,
    );
    const { fresh, stale } = Baseline.empty().filterNew([violation]);
    assert.deepEqual(fresh, [violation]);
    assert.deepEqual(stale, []);
  });

  it('informa como obsoleta una entrada cuya cuenta real bajó', () => {
    const violation = new Violation(
      'front/a.dart',
      RuleId.HARDCODED_COLOR,
      'm',
      1,
    );
    const baseline = Baseline.fromViolations([violation, violation]);
    const { fresh, stale } = baseline.filterNew([violation]);
    assert.deepEqual(fresh, []);
    assert.deepEqual(stale, [
      `front/a.dart: ${RuleId.HARDCODED_COLOR} (línea base 2, real 1)`,
    ]);
  });

  it('informa como obsoleta una entrada que ya no tiene violaciones', () => {
    const violation = new Violation(
      'front/a.dart',
      RuleId.HARDCODED_COLOR,
      'm',
      1,
    );
    const baseline = Baseline.fromViolations([violation, violation]);
    const { stale } = baseline.filterNew([]);
    assert.deepEqual(stale, [
      `front/a.dart: ${RuleId.HARDCODED_COLOR} (línea base 2, real 0)`,
    ]);
  });
});
