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

  it('passes in --all when there are no violations', () => {
    repo.current.write(SCREEN, CLEAN);
    assert.equal(repo.current.runCheck('--all').status, 0);
  });

  it('fails in --all with one violation', () => {
    repo.current.write(SCREEN, ONE);
    const result = repo.current.runCheck('--all');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /hardcoded-color/);
    assert.match(result.stderr, new RegExp(SCREEN.replace(/\./g, '\\.')));
  });

  it('--changed checks only what changed and --all checks everything', () => {
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

  it('--all fails with a pubspec that uses ^ in a dependency', () => {
    repo.current.write(
      'front/packages/ui/pubspec.yaml',
      'name: ui\ndependencies:\n  go_router: ^18.1.4\n',
    );
    const result = repo.current.runCheck('--all');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /pubspec-caret-version/);
  });

  it('--all fails with a test that imports a mocking library', () => {
    repo.current.write(
      'front/packages/ui/test/a_test.dart',
      "import 'package:mocktail/mocktail.dart';\n",
    );
    const result = repo.current.runCheck('--all');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /mock-library/);
  });

  it('--all fails with a pubspec that depends on a mocking library', () => {
    repo.current.write(
      'front/packages/ui/pubspec.yaml',
      'name: ui\ndev_dependencies:\n  mockito: 5.4.4\n',
    );
    const result = repo.current.runCheck('--all');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /mock-library/);
  });

  it('rejects an unknown mode with code 2', () => {
    repo.current.write(SCREEN, CLEAN);
    const result = repo.current.runCheck('--bogus');
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Unknown mode/);
  });

  it('rejects --update-baseline as an unknown mode with code 2', () => {
    repo.current.write(SCREEN, CLEAN);
    const result = repo.current.runCheck('--update-baseline');
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Unknown mode/);
  });
});
