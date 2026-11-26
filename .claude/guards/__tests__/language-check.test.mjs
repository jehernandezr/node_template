import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { LanguageBaseline } from '../language-baseline.mjs';
import { LanguageAllowlist } from '../language-allowlist.mjs';
import { LanguageCheck } from '../language-check.mjs';
import { LanguagePolicy } from '../language-policy.mjs';
import { SpanishDetector } from '../spanish-detector.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const SCRIPT = join(ROOT, '.claude/guards/check-language.mjs');
const BASELINE = '.claude/guards/language-baseline.json';
const BASELINE_CAPS = {
  'backend/infra/terraform/modules/alb/main.tf': 2,
  'backend/infra/terraform/modules/cloudfront-waf/main.tf': 1,
  'backend/infra/terraform/modules/http-api/main.tf': 3,
  'backend/infra/terraform/modules/observability/main.tf': 1,
  'backend/infra/terraform/modules/oidc-github/main.tf': 2,
  'backend/infra/terraform/modules/rds-postgres/main.tf': 4,
  'backend/infra/terraform/modules/service-fargate/main.tf': 2,
  'backend/infra/terraform/modules/ses/main.tf': 1,
  'backend/infra/terraform/stacks/data/main.tf': 2,
  'backend/infra/terraform/stacks/platform/alarms.tf': 1,
  'backend/infra/terraform/stacks/platform/compute.tf': 1,
};

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

  it('leaves English and identifiers alone', () => {
    for (const line of [
      '/** Returns the tasks that are still pending. */',
      'for (const item of items) { if (item.id) return item; }',
      'The tenant, its users and their sessions are erased.',
    ]) {
      assert.equal(detector.isSpanish(line), false, line);
    }
  });

  it('flags one whole word of the closed list or one accented character, and nothing inside a longer word', () => {
    assert.equal(detector.isSpanish('Runs para once.'), true);
    assert.equal(detector.isSpanish("const user = { name: 'José' };"), true);
    assert.equal(
      detector.isSpanish('Reads the paragraph and the queue.'),
      false,
    );
  });

  it('reads only the comments and strings of code', () => {
    const code = { syntax: 'c' };
    assert.equal(detector.isSpanish('const para = cada(esta);', code), false);
    assert.equal(
      detector.isSpanish("const label = 'una tarea'; // ok", code),
      true,
    );
    assert.equal(
      detector.isSpanish('total = count + 1 // suma para el total', code),
      true,
    );
    assert.equal(
      detector.isSpanish('desde = 1 # comentario para el valor', {
        syntax: 'hash',
      }),
      true,
    );
    assert.equal(detector.isSpanish('desde = 1', { syntax: 'hash' }), false);
  });

  it('keeps a closed list of fifty words, which a false positive never widens', () => {
    assert.equal(SpanishDetector.WORDS.length, 50);
    assert.ok(Object.isFrozen(SpanishDetector.WORDS));
    assert.equal(new Set(SpanishDetector.WORDS).size, 50);
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

describe('LanguageAllowlist', () => {
  const allowlist = new LanguageAllowlist({
    paths: [{ pattern: 'front/**/*.arb', reason: 'product text' }],
    lines: [
      {
        file: 'src/store.ts',
        text: "redis.call('DEL'",
        reason: 'Redis command',
      },
    ],
  });

  it('allows a whole path by glob and a single line by its text', () => {
    assert.equal(
      allowlist.allowsFile('front/apps/web/lib/l10n/app_es.arb'),
      true,
    );
    assert.equal(allowlist.allowsFile('front/apps/web/lib/main.dart'), false);
    assert.equal(
      allowlist.allowsLine('src/store.ts', "  redis.call('DEL', KEYS[1])"),
      true,
    );
    assert.equal(
      allowlist.allowsLine('src/other.ts', "  redis.call('DEL', KEYS[1])"),
      false,
    );
  });

  it('lets an allowed line pass the check while the rest of its file is still read', () => {
    const fixture = new Fixture().write(
      'src/store.ts',
      'const script = "redis.call(\'DEL\', KEYS[1])";\n/** Borra la clave del usuario. */\n',
    );
    try {
      const findings = new LanguageCheck(
        fixture.root,
        new LanguageBaseline({}),
        new LanguagePolicy(allowlist),
      ).checkFiles(['src/store.ts'], false);
      assert.deepEqual(
        findings.map((finding) => finding.line),
        [2],
      );
    } finally {
      fixture.dispose();
    }
  });

  it('gives every entry of the repository allowlist a reason on one line', () => {
    assert.deepEqual(
      LanguageAllowlist.read(
        join(ROOT, '.claude/guards/language-allowlist.json'),
      ).unexplained(),
      [],
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

describe('language-baseline.json', () => {
  const baseline = JSON.parse(readFileSync(join(ROOT, BASELINE), 'utf8'));
  const total = (counts) =>
    Object.values(counts).reduce((sum, count) => sum + count, 0);

  it('never lists a file the recorded caps do not list', () => {
    assert.deepEqual(
      Object.keys(baseline).filter((file) => !(file in BASELINE_CAPS)),
      [],
    );
  });

  it('never raises an entry or the total above the recorded caps', () => {
    const raised = Object.entries(baseline)
      .filter(([file, count]) => count > (BASELINE_CAPS[file] ?? 0))
      .map(([file, count]) => `${file}: ${count}`);
    assert.deepEqual(raised, []);
    assert.ok(total(baseline) <= 20, `total ${total(baseline)} above 20`);
    assert.equal(total(BASELINE_CAPS), 20);
  });
});

describe('check-language.mjs --update-baseline', () => {
  it('lowers an entry but never raises one or adds a file', () => {
    const fixture = new Fixture()
      .write(
        'grown.ts',
        '/** Crea la tarea que falta para el usuario. */\n/** Guarda la sesión del usuario en la base. */\n',
      )
      .write('shrunk.ts', '/** Creates the missing task. */\n')
      .write(
        'new.ts',
        '/** Devuelve la lista de tareas que están pendientes. */\n',
      )
      .write(
        BASELINE,
        `${JSON.stringify({ 'grown.ts': 1, 'shrunk.ts': 2 })}\n`,
      );
    try {
      spawnSync('git', ['init', '-q'], { cwd: fixture.root });
      const result = spawnSync(
        process.execPath,
        [SCRIPT, '--update-baseline', fixture.root],
        { encoding: 'utf8' },
      );
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(
        JSON.parse(readFileSync(join(fixture.root, BASELINE), 'utf8')),
        { 'grown.ts': 1 },
      );
    } finally {
      fixture.dispose();
    }
  });
});
