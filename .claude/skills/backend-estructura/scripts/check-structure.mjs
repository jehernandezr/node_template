#!/usr/bin/env node
// Verifica las reglas de backend-estructura, backend-codigo-enterprise y backend-pruebas.
// Uso: node check-structure.mjs [--all | --changed] [raíz del repositorio]
//   --changed (por defecto) revisa solo los archivos cambiados frente a HEAD, incluidos los nuevos.
//   --all revisa todo backend/.
// Sale con código 1 y la lista de violaciones si encuentra alguna.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

class BackendStructureCheck {
  static IGNORED_DIRS = new Set([
    'node_modules',
    '.git',
    '.nx',
    'coverage',
    'out-tsc',
  ]);
  static TEST_FILE = /\.(int-)?spec\.ts$/;
  static INFRA_IN_DOMAIN =
    /from\s+['"](@nestjs\/|typeorm|pg['"/]|@aws-sdk\/|iovalkey|express)/;
  static OUTER_LAYER = /from\s+['"](\.\.\/)+(infrastructure|presentation)\//;
  // Pruebas de integración: el sufijo es `.int-spec.ts`; `*.integration.spec.ts` correría como unitaria.
  static MISNAMED_INTEGRATION_TEST = /\.integration\.spec\.ts$/;
  // El núcleo de las librerías no conoce NestJS: solo lo importa `src/nest/`.
  static NEST_GUARDED_AREA =
    /^backend\/libs\/(platform|contracts|shared)\/.+\.ts$/;
  static NEST_FOLDER = /\/src\/nest\//;
  static NEST_IMPORT =
    /(?:from|import)\s*\(?\s*['"](?:@nestjs\/[^'"]*|@platform\/[\w-]+\/nest)['"]/;
  // Archivos donde una función exportada es la forma declarada de la API, no un script suelto.
  static FUNCTION_EXCEPTIONS = [
    {
      pattern: /^backend\/libs\/contracts\/[^/]+\/src\/kit\/define-[\w-]+\.ts$/,
      reason: 'fábricas declarativas define* de contracts',
    },
    {
      pattern: /^backend\/libs\/contracts\/[^/]+\/src\/kit\/error-catalog\.ts$/,
      reason: 'defineErrorCatalog de contracts',
    },
    {
      pattern: /^backend\/libs\/platform\/config\/src\/(env|secret)\.ts$/,
      reason: 'esquemas zod de env.ts y secret()',
    },
    {
      pattern: /^backend\/tools\/[^/]+\/src\/main\.ts$/,
      reason: 'main() de las herramientas',
    },
    {
      pattern:
        /^backend\/libs\/contracts\/platform\/src\/kit\/field-errors\.ts$/,
      reason: 'utilidades del DSL de contratos',
    },
    {
      pattern:
        /^backend\/libs\/contracts\/platform\/src\/kit\/message-definition\.ts$/,
      reason: 'utilidades del DSL de contratos',
    },
    {
      pattern:
        /^backend\/libs\/contracts\/platform\/src\/schemas\/pagination\.schema\.ts$/,
      reason: 'esquema zod parametrizado del DSL de contratos',
    },
    {
      pattern: /^backend\/libs\/platform\/primitives\/src\/call-outcome\.ts$/,
      reason: 'guardas de tipo puras',
    },
    {
      pattern:
        /^backend\/libs\/platform\/messaging\/src\/topology\/contract-topology\.ts$/,
      reason: 'fábrica declarativa de topología sobre contratos',
    },
    {
      pattern:
        /^backend\/libs\/platform\/persistence\/src\/metadata\/entity-metadata\.ts$/,
      reason: 'decorador Audited y su lector',
    },
  ];
  static LOOSE_EXPORTED_FUNCTION =
    /^export\s+(async\s+)?function\s+\w+|^export\s+const\s+\w+\s*(:[^=]+)?=\s*(async\s+)?(\([^)]*\)|\w+)\s*=>/m;

  constructor(root, mode) {
    this.root = root;
    this.mode = mode;
    this.violations = [];
  }

  run() {
    const files =
      this.mode === '--all'
        ? this.allBackendFiles()
        : this.changedBackendFiles();
    for (const file of files) this.checkFile(file);
    if (this.mode === '--all') this.checkTree();
    return this.violations;
  }

  changedBackendFiles() {
    const git = (args) =>
      execFileSync('git', args, { cwd: this.root, encoding: 'utf8' })
        .split('\n')
        .filter(Boolean);
    const changed = new Set([
      ...git(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD']),
      ...git(['ls-files', '--others', '--exclude-standard']),
    ]);
    return [...changed].filter(
      (f) => f.startsWith('backend/') && existsSync(join(this.root, f)),
    );
  }

  allBackendFiles() {
    // Solo archivos versionados o nuevos: los artefactos ignorados no cuentan como código.
    return execFileSync(
      'git',
      ['ls-files', '-co', '--exclude-standard', 'backend/'],
      { cwd: this.root, encoding: 'utf8' },
    )
      .split('\n')
      .filter((f) => f && existsSync(join(this.root, f)));
  }

  checkFile(file) {
    const inCodeProject = /^backend\/(libs|apps|tools)\//.test(file);
    if (inCodeProject && /\/src\/lib\//.test(file)) {
      this.add(file, 'el código va directo en src/, sin src/lib/');
    }
    if (
      BackendStructureCheck.TEST_FILE.test(file) &&
      !/\/(__tests__|e2e)\//.test(file)
    ) {
      this.add(
        file,
        'las pruebas van en una carpeta __tests__/ junto al código que prueban',
      );
    }
    if (
      inCodeProject &&
      /\/src\/(.+\/)?(testing|test|support)\//.test(file) &&
      !/\/__tests__\//.test(file)
    ) {
      this.add(
        file,
        'los utilitarios de prueba van en __tests__/utils, no en una carpeta testing aparte',
      );
    }
    if (/^backend\/libs\/.+\/package\.json$/.test(file)) {
      this.add(
        file,
        'las librerías no tienen package.json: se importan por alias de TypeScript',
      );
    }
    if (inCodeProject && /\/dist\//.test(file)) {
      this.add(
        file,
        'el compilado de cada app va en backend/dist/<app>, nunca dentro de un proyecto',
      );
    }
    if (BackendStructureCheck.MISNAMED_INTEGRATION_TEST.test(file)) {
      this.add(
        file,
        'las pruebas de integración se llaman *.int-spec.ts: *.integration.spec.ts correría como unitaria',
      );
    }
    if (file.endsWith('.ts')) this.checkNestBoundary(file);
    if (file.endsWith('.ts') && !BackendStructureCheck.TEST_FILE.test(file))
      this.checkSource(file);
  }

  // Con --changed solo cuentan las líneas nuevas: mover un archivo no obliga a refactorizarlo,
  // pero lo que se escribe hoy sí cumple las reglas.
  sourceToCheck(file) {
    const full = readFileSync(join(this.root, file), 'utf8');
    if (this.mode === '--all') return full;
    this.addedLines ??= this.readAddedLines();
    this.untracked ??= new Set(
      execFileSync(
        'git',
        ['ls-files', '--others', '--exclude-standard', 'backend/'],
        { cwd: this.root, encoding: 'utf8' },
      )
        .split('\n')
        .filter(Boolean),
    );
    // Un archivo nuevo sin versionar se revisa entero; uno movido sin cambios no aporta líneas.
    return this.untracked.has(file) ? full : (this.addedLines.get(file) ?? '');
  }

  // Un solo diff de todo el árbol, para que git detecte los archivos movidos como renombres.
  readAddedLines() {
    const diff = execFileSync(
      'git',
      ['diff', '-U0', '-M', 'HEAD', '--', 'backend/'],
      {
        cwd: this.root,
        encoding: 'utf8',
        maxBuffer: 256 * 1024 * 1024,
      },
    );
    const added = new Map();
    let current = null;
    for (const line of diff.split('\n')) {
      if (line.startsWith('+++ ')) {
        current = line.startsWith('+++ b/') ? line.slice(6) : null;
        if (current) added.set(current, '');
      } else if (current && line.startsWith('+')) {
        added.set(current, `${added.get(current)}${line.slice(1)}\n`);
      }
    }
    return added;
  }

  // Incluye las pruebas: las de código Nest viven en src/nest/__tests__.
  checkNestBoundary(file) {
    if (
      !BackendStructureCheck.NEST_GUARDED_AREA.test(file) ||
      BackendStructureCheck.NEST_FOLDER.test(file)
    )
      return;
    if (BackendStructureCheck.NEST_IMPORT.test(this.sourceToCheck(file))) {
      this.add(
        file,
        'fuera de src/nest/ no se importa @nestjs/* ni una sub-entrada @platform/<lib>/nest',
      );
    }
  }

  checkSource(file) {
    const text = this.sourceToCheck(file);
    if (/\/domain\//.test(file)) {
      if (BackendStructureCheck.INFRA_IN_DOMAIN.test(text)) {
        this.add(
          file,
          'domain/ no importa NestJS, TypeORM, pg, AWS ni otra infraestructura',
        );
      }
      if (
        /from\s+['"](\.\.\/)+application\//.test(text) ||
        BackendStructureCheck.OUTER_LAYER.test(text)
      ) {
        this.add(
          file,
          'domain/ no depende de application/, infrastructure/ ni presentation/',
        );
      }
    }
    if (
      /\/application\//.test(file) &&
      BackendStructureCheck.OUTER_LAYER.test(text)
    ) {
      this.add(
        file,
        'application/ no depende de infrastructure/ ni presentation/',
      );
    }
    const allowsFunctions =
      /\/(utils|__tests__|migrations)\//.test(file) ||
      /(index|\.config|main|worker|migrate|instrumentation)\.ts$/.test(file) ||
      BackendStructureCheck.FUNCTION_EXCEPTIONS.some((e) =>
        e.pattern.test(file),
      );
    if (
      !allowsFunctions &&
      BackendStructureCheck.LOOSE_EXPORTED_FUNCTION.test(text)
    ) {
      this.add(
        file,
        'exporta funciones sueltas: el comportamiento va en clases con dependencias inyectadas',
      );
    }
  }

  checkTree() {
    const nodeModules = [];
    const walk = (dir, depth) => {
      if (depth > 6) return;
      for (const name of readdirSync(dir)) {
        if (name === '.git' || name === '.claude') continue;
        const full = join(dir, name);
        if (!statSync(full).isDirectory()) continue;
        if (name === 'node_modules') {
          nodeModules.push(relative(this.root, full) || 'node_modules');
          continue;
        }
        walk(full, depth + 1);
      }
    };
    walk(this.root, 0);
    for (const area of ['libs', 'apps', 'tools']) {
      const base = join(this.root, 'backend', area);
      if (existsSync(base)) this.findDist(base);
    }
    if (nodeModules.length > 1) {
      this.add(
        nodeModules.join(', '),
        'debe existir un solo node_modules, en la raíz',
      );
    }
  }

  findDist(dir) {
    for (const name of readdirSync(dir)) {
      if (BackendStructureCheck.IGNORED_DIRS.has(name)) continue;
      const full = join(dir, name);
      if (!statSync(full).isDirectory()) continue;
      if (name === 'dist')
        this.add(
          relative(this.root, full),
          'el compilado de cada app va en backend/dist/<app>',
        );
      else this.findDist(full);
    }
  }

  add(file, rule) {
    this.violations.push(`${file}: ${rule}`);
  }
}

const args = process.argv.slice(2);
const mode = args.find((a) => a.startsWith('--')) ?? '--changed';
const root = args.find((a) => !a.startsWith('--')) ?? process.cwd();
const violations = new BackendStructureCheck(root, mode).run();
if (violations.length > 0) {
  console.error(
    `Reglas del backend incumplidas (${violations.length}):\n- ${violations.join('\n- ')}`,
  );
  process.exit(1);
}
