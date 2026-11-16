import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { TempRepository } from './utils/temp-repository.mjs';

const SCREEN = 'front/microfrontends/tasks/lib/src/screens/a.dart';
const OTHER = 'front/microfrontends/tasks/lib/src/screens/b.dart';
const CLEAN = 'class A {}\n';
const ONE = 'final c = Colors.red;\n';

describe('check-structure', () => {
  const repo = { current: null };

  beforeEach(() => {
    repo.current = new TempRepository();
  });

  afterEach(() => {
    repo.current.dispose();
  });

  it('pasa en --all cuando no hay violaciones', () => {
    repo.current.write(SCREEN, CLEAN);
    assert.equal(repo.current.runCheck('--all').status, 0);
  });

  it('falla en --all con una violación', () => {
    repo.current.write(SCREEN, ONE);
    const result = repo.current.runCheck('--all');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /hardcoded-color/);
    assert.match(result.stderr, new RegExp(SCREEN.replace(/\./g, '\\.')));
  });

  it('--changed solo revisa lo tocado y --all revisa todo', () => {
    repo.current.write(SCREEN, ONE);
    repo.current.write(OTHER, ONE);
    repo.current.commitAll();
    assert.equal(repo.current.runCheck('--changed').status, 0);

    repo.current.write(SCREEN, ONE + '\n');
    const changed = repo.current.runCheck('--changed');
    assert.equal(changed.status, 1);
    assert.match(changed.stderr, /screens\/a\.dart/);
    assert.doesNotMatch(changed.stderr, /screens\/b\.dart/);

    const all = repo.current.runCheck('--all');
    assert.equal(all.status, 1);
    assert.match(all.stderr, /screens\/a\.dart/);
    assert.match(all.stderr, /screens\/b\.dart/);
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

  it('rechaza --update-baseline como modo desconocido con código 2', () => {
    repo.current.write(SCREEN, CLEAN);
    const result = repo.current.runCheck('--update-baseline');
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Modo desconocido/);
  });
});
