// Plugin de Nx que registra cada miembro del pub workspace de front/ como proyecto.
//
// - Lee la lista `workspace:` de front/pubspec.yaml; solo esos paquetes son proyectos.
// - Cada proyecto se llama `front-<nombre del pubspec>` y tiene las tareas
//   `analyze`, `format-check` y, si tiene carpeta test/, `test`. Todas usan caché.
// - En los microfrontends, `analyze` también corre
//   `tools/check_microfrontend_boundaries.dart`: falla si el microfrontend
//   declara o importa otro `mf_*`.
// - Las dependencias entre paquetes salen de `dependencies` y `dev_dependencies`.
// - `front-contracts` depende de los paquetes de contratos del backend
//   (backend/libs/contracts/*), porque su Dart se genera desde ellos.
//
// Requiere `flutter pub get` en front/ antes de correr las tareas.
'use strict';

const { existsSync, readFileSync } = require('node:fs');
const { dirname, join, relative } = require('node:path');

const FRONT_ROOT = 'front';
const PROJECT_PREFIX = 'front-';
const CONTRACTS_PACKAGE = 'contracts';
const BACKEND_CONTRACTS_ROOT = 'backend/libs/contracts/';
const MICROFRONTENDS_KIND = 'microfrontends';
const BOUNDARIES_SCRIPT = 'front/tools/check_microfrontend_boundaries.dart';

/** Lee los campos de pubspec.yaml que usa el plugin, sin dependencias externas. */
function parsePubspec(text) {
  const result = { name: undefined, workspace: [], deps: [] };
  let section;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+#.*$/, '').trimEnd();
    if (!line.trim()) continue;
    const top = /^([A-Za-z_]+):\s*(.*)$/.exec(line);
    if (top) {
      section = top[1];
      if (section === 'name') result.name = top[2].trim();
      continue;
    }
    if (section === 'workspace') {
      const item = /^\s+-\s+(.+)$/.exec(line);
      if (item) result.workspace.push(item[1].trim());
    } else if (section === 'dependencies' || section === 'dev_dependencies') {
      const dep = /^ {2}([A-Za-z_][A-Za-z0-9_]*):/.exec(line);
      if (dep) result.deps.push(dep[1]);
    }
  }
  return result;
}

function readPubspec(workspaceRoot, relativePath) {
  return parsePubspec(readFileSync(join(workspaceRoot, relativePath), 'utf8'));
}

/** Rutas (relativas a la raíz) de los pubspec.yaml miembros del workspace. */
function memberPubspecs(workspaceRoot) {
  const rootPubspec = join(FRONT_ROOT, 'pubspec.yaml');
  if (!existsSync(join(workspaceRoot, rootPubspec))) return new Set();
  const { workspace } = readPubspec(workspaceRoot, rootPubspec);
  return new Set(workspace.map((member) => join(FRONT_ROOT, member, 'pubspec.yaml')));
}

const sharedInputs = [
  '{workspaceRoot}/front/pubspec.yaml',
  '{workspaceRoot}/front/pubspec.lock',
  '{workspaceRoot}/front/analysis_options.yaml',
  '{workspaceRoot}/front/.flutter-version',
];

function targetsFor(workspaceRoot, projectRoot, kind) {
  const inputs = ['default', '^default', ...sharedInputs];
  const isMicrofrontend = kind === MICROFRONTENDS_KIND;
  // Ruta del script relativa a la carpeta del proyecto (front/microfrontends/<mf>).
  const boundaries = relative(join(workspaceRoot, projectRoot), join(workspaceRoot, BOUNDARIES_SCRIPT));
  const targets = {
    analyze: {
      command: isMicrofrontend
        ? `flutter analyze --no-pub && dart run ${boundaries}`
        : 'flutter analyze --no-pub',
      options: { cwd: projectRoot },
      cache: true,
      inputs: isMicrofrontend ? [...inputs, `{workspaceRoot}/${BOUNDARIES_SCRIPT}`] : inputs,
    },
    'format-check': {
      command: 'dart format --output=none --set-exit-if-changed lib test',
      options: { cwd: projectRoot },
      cache: true,
      inputs: ['default'],
    },
  };
  if (existsSync(join(workspaceRoot, projectRoot, 'test'))) {
    targets.test = {
      command: 'flutter test --no-pub',
      options: { cwd: projectRoot },
      cache: true,
      inputs,
    };
  }
  return targets;
}

const createNodes = [
  'front/**/pubspec.yaml',
  async (files, _options, context) => {
    const members = memberPubspecs(context.workspaceRoot);
    const results = [];
    for (const file of files) {
      if (!members.has(file)) continue;
      const { name } = readPubspec(context.workspaceRoot, file);
      if (!name) continue;
      const root = dirname(file);
      const kind = root.split('/')[1]; // apps, microfrontends, packages o tools
      results.push([
        file,
        {
          projects: {
            [root]: {
              name: PROJECT_PREFIX + name,
              root,
              projectType: kind === 'apps' ? 'application' : 'library',
              tags: ['lang:dart', `type:front-${kind}`],
              targets: targetsFor(context.workspaceRoot, root, kind),
            },
          },
        },
      ]);
    }
    return results;
  },
];

function createDependencies(_options, context) {
  const byPackage = new Map();
  for (const [projectName, project] of Object.entries(context.projects)) {
    if (!projectName.startsWith(PROJECT_PREFIX)) continue;
    const pubspec = join(project.root, 'pubspec.yaml');
    if (!existsSync(join(context.workspaceRoot, pubspec))) continue;
    byPackage.set(projectName.slice(PROJECT_PREFIX.length), { projectName, pubspec });
  }

  const dependencies = [];
  for (const { projectName, pubspec } of byPackage.values()) {
    const { deps } = readPubspec(context.workspaceRoot, pubspec);
    for (const dep of deps) {
      const target = byPackage.get(dep);
      if (!target || target.projectName === projectName) continue;
      dependencies.push({
        source: projectName,
        target: target.projectName,
        sourceFile: pubspec,
        type: 'static',
      });
    }
  }

  const contracts = byPackage.get(CONTRACTS_PACKAGE);
  if (contracts) {
    for (const [projectName, project] of Object.entries(context.projects)) {
      if (!project.root.startsWith(BACKEND_CONTRACTS_ROOT)) continue;
      dependencies.push({ source: contracts.projectName, target: projectName, type: 'implicit' });
    }
  }
  return dependencies;
}

module.exports = { name: 'front-flutter', createNodesV2: createNodes, createDependencies, parsePubspec };
