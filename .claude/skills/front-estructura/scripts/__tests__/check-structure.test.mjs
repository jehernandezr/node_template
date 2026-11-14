import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { TempRepository } from './utils/temp-repository.mjs';

const SCREEN = 'front/microfrontends/tasks/lib/src/screens/a.dart';
const OTHER = 'front/microfrontends/tasks/lib/src/screens/b.dart';
const BASELINE = 'front/tools/structure-baseline.json';
const CLEAN = 'class A {}\n';
const ONE = 'final c = Colors.red;\n';
const TWO = 'final c = Colors.red;\nfinal d = Colors.blue;\n';

describe('check-structure', () => {
  const repo = { current: null };

  beforeEach(() => {
    repo.current = new TempRepository();
  });

  afterEach(() => {
    repo.current.dispose();
  });

  const baselineWith = (file, count) =>
    `{"version":1,"violations":{"${file}":{"hardcoded-color":${count}}}}`;

  it('pasa en --all cuando no hay violaciones', () => {
    repo.current.write(SCREEN, CLEAN);
    assert.equal(repo.current.runCheck('--all').status, 0);
  });

  it('falla en --all con una violación sin línea base', () => {
    repo.current.write(SCREEN, ONE);
    const result = repo.current.runCheck('--all');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /hardcoded-color/);
    assert.match(result.stderr, new RegExp(SCREEN.replace(/\./g, '\\.')));
  });

  it('tolera las violaciones de la línea base y falla al superarlas', () => {
    repo.current.write(SCREEN, ONE);
    repo.current.write(BASELINE, baselineWith(SCREEN, 1));
    assert.equal(repo.current.runCheck('--all').status, 0);
    repo.current.write(SCREEN, TWO);
    assert.equal(repo.current.runCheck('--all').status, 1);
  });

  it('avisa de la entrada de la línea base que ya no aplica', () => {
    repo.current.write(SCREEN, CLEAN);
    repo.current.write(BASELINE, baselineWith(SCREEN, 1));
    const result = repo.current.runCheck('--all');
    assert.equal(result.status, 0);
    assert.match(result.stderr, /ya no aplica/);
  });

  it('--changed ignora la línea base y solo revisa lo tocado', () => {
    repo.current.write(SCREEN, ONE);
    repo.current.write(OTHER, ONE);
    repo.current.write(
      BASELINE,
      '{"version":1,"violations":{"' +
        SCREEN +
        '":{"hardcoded-color":1},"' +
        OTHER +
        '":{"hardcoded-color":1}}}',
    );
    repo.current.commitAll();
    assert.equal(repo.current.runCheck('--all').status, 0);
    assert.equal(repo.current.runCheck('--changed').status, 0);

    repo.current.write(SCREEN, ONE + '\n');
    const result = repo.current.runCheck('--changed');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /screens\/a\.dart/);
    assert.doesNotMatch(result.stderr, /screens\/b\.dart/);
  });

  it('--update-baseline regenera la línea base con las violaciones actuales', () => {
    repo.current.write(SCREEN, ONE);
    assert.equal(repo.current.runCheck('--update-baseline').status, 0);
    assert.equal(
      repo.current.read(BASELINE),
      '{\n  "version": 1,\n  "violations": {\n    "front/microfrontends/tasks/lib/src/screens/a.dart": {\n      "hardcoded-color": 1\n    }\n  }\n}\n',
    );
    assert.equal(repo.current.runCheck('--all').status, 0);
  });

  it('--all falla con un pubspec que usa ^ en una dependencia', () => {
    repo.current.write(
      'front/packages/ui/pubspec.yaml',
      'name: ui\ndependencies:\n  go_router: ^18.1.4\n',
    );
    const result = repo.current.runCheck('--all');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /pubspec-caret-version/);
  });

  it('rechaza un modo desconocido con código 2', () => {
    repo.current.write(SCREEN, CLEAN);
    const result = repo.current.runCheck('--bogus');
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Modo desconocido/);
  });
});
