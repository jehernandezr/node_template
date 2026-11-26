import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { LanguageBaseline } from '../language-baseline.mjs';
import { LanguageCheck } from '../language-check.mjs';
import { SpanishDetector } from '../spanish-detector.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const SCRIPT = join(ROOT, '.claude/guards/check-language.mjs');

/** A throwaway folder with files laid out as in the repository. */
class Fixture {
  constructor() {
    this.root = mkdtempSync(join(tmpdir(), 'language-check-'));
  }

  /**
   * Writes a file under the fixture root.
   * @param {string} file Path from the root.
   * @param {string} text Content.
   * @returns {Fixture} This fixture.
   */
  write(file, text) {
    mkdirSync(dirname(join(this.root, file)), { recursive: true });
    writeFileSync(join(this.root, file), text);
    return this;
  }

  /** Removes the folder. */
  dispose() {
    rmSync(this.root, { recursive: true, force: true });
  }
}

describe('SpanishDetector', () => {
  const detector = new SpanishDetector();

  it('flags Spanish prose, comments and descriptions', () => {
    for (const line of [
      '/** Devuelve la lista de tareas que están pendientes. */',
      'description = "Tráfico del ALB"',
      '¿Por qué falla?',
      'Cada servicio agrega sus rutas desde su stack.',
    ]) {
      assert.equal(detector.isSpanish(line), true, line);
    }
  });

  it('leaves English, identifiers and a lone accented name alone', () => {
    for (const line of [
      '/** Returns the tasks that are still pending. */',
      "const user = { name: 'José' };",
      'for (const item of items) { if (item.id) return item; }',
      'The tenant, its users and their sessions are erased.',
    ]) {
      assert.equal(detector.isSpanish(line), false, line);
    }
  });

  it('lets a document quote a Spanish label of the interface', () => {
    assert.equal(
      detector.isSpanish('The list loads the next page with "Cargar más".', {
        prose: true,
      }),
      false,
    );
  });

  it('treats single-quoted literals as data only where the file says so', () => {
    const line = "expect(find.text('Selecciona una tarea para verla aquí.'));";
    assert.equal(detector.isSpanish(line), true);
    assert.equal(detector.isSpanish(line, { dataStrings: true }), false);
  });
});

describe('LanguageCheck', () => {
  const fixture = new Fixture()
    .write(
      'backend/apps/a/src/a.ts',
      '/** Crea la tarea que falta para el usuario. */\n',
    )
    .write('backend/apps/a/src/b.ts', '/** Creates the missing task. */\n')
    .write(
      'front/microfrontends/a/lib/l10n/app_es.arb',
      '{"x": "Crea la tarea para el usuario"}\n',
    )
    .write(
      'backend/apps/a/src/__tests__/a.spec.ts',
      "const title = 'Regar las plantas del jardín';\n",
    )
    .write('infra/main.tf', 'description = "Tráfico del ALB"\n');
  after(() => fixture.dispose());

  it('reports a Spanish line in a developer file and skips product text and test data', () => {
    const findings = new LanguageCheck(
      fixture.root,
      new LanguageBaseline({}),
    ).checkFiles(
      [
        'backend/apps/a/src/a.ts',
        'backend/apps/a/src/b.ts',
        'front/microfrontends/a/lib/l10n/app_es.arb',
        'backend/apps/a/src/__tests__/a.spec.ts',
      ],
      false,
    );
    assert.deepEqual(
      findings.map((finding) => `${finding.file}:${finding.line}`),
      ['backend/apps/a/src/a.ts:1'],
    );
  });

  it('accepts what the baseline records and asks to lower it once a line is translated', () => {
    const check = new LanguageCheck(
      fixture.root,
      new LanguageBaseline({
        'infra/main.tf': 1,
        'backend/apps/a/src/b.ts': 1,
      }),
    );
    const findings = check.checkFiles(
      ['infra/main.tf', 'backend/apps/a/src/b.ts'],
      false,
    );
    assert.equal(findings.length, 1);
    assert.match(findings[0].message, /lower its entry/);
  });

  it('rejects a baseline entry whose file is gone when checking everything', () => {
    const check = new LanguageCheck(
      fixture.root,
      new LanguageBaseline({ 'gone.ts': 2 }),
    );
    assert.match(check.checkFiles([], true)[0].message, /no longer exists/);
  });

  it('rejects a Spanish commit message and ignores the comments git adds', () => {
    const check = new LanguageCheck(fixture.root, new LanguageBaseline({}));
    assert.equal(
      check.checkMessage('fix: corrige el error de la sesión que expira\n')
        .length,
      1,
    );
    assert.equal(
      check.checkMessage(
        'fix: renew the session\n# Por favor escribe el mensaje\n',
      ).length,
      0,
    );
  });
});

describe('check-language.mjs', () => {
  it('passes on the repository', () => {
    const result = spawnSync(process.execPath, [SCRIPT, '--all', ROOT], {
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
  });

  it('fails on a given file with Spanish JSDoc', () => {
    const fixture = new Fixture().write(
      'a.ts',
      '/** Guarda la sesión del usuario en la base. */\n',
    );
    try {
      const result = spawnSync(
        process.execPath,
        [SCRIPT, '--files', join(fixture.root, 'a.ts')],
        {
          cwd: ROOT,
          encoding: 'utf8',
        },
      );
      assert.equal(result.status, 1);
    } finally {
      fixture.dispose();
    }
  });

  it('rejects an unknown mode with code 2', () => {
    const result = spawnSync(process.execPath, [SCRIPT, '--bogus'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(result.status, 2);
  });
});
