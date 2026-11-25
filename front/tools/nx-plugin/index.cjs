// Nx plugin that registers each member of the front/ pub workspace as a project.
//
// - Reads the `workspace:` list of front/pubspec.yaml; only those packages are projects.
// - Each project is named `front-<pubspec name>` and has the tasks
//   `analyze`, `format-check` and, if it has a test/ folder, `test`. All are cached.
// - In the microfrontends, `analyze` also runs
//   `tools/check_microfrontend_boundaries.dart`: it fails if the microfrontend
//   declares or imports another `mf_*`, if its manifest loads without `deferred` anything
//   that is not a constant, enum or lifecycle, or if its `shared` folders
//   do not follow the order enums, constants, types, utils.
// - Dependencies between packages come from `dependencies` and `dev_dependencies`.
// - `front-contracts` depends on the backend contract packages
//   (backend/libs/contracts/*), because its Dart is generated from them.
//
// Requires `flutter pub get` in front/ before running the tasks.
'use strict';

const { existsSync, readFileSync } = require('node:fs');
const { dirname, join, relative } = require('node:path');

const FRONT_ROOT = 'front';
const PROJECT_PREFIX = 'front-';
const CONTRACTS_PACKAGE = 'contracts';
const BACKEND_CONTRACTS_ROOT = 'backend/libs/contracts/';
const MICROFRONTENDS_KIND = 'microfrontends';
const BOUNDARIES_SCRIPT = 'front/tools/check_microfrontend_boundaries.dart';

/** Reads the pubspec.yaml fields the plugin uses, without external dependencies. */
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

/** Paths (relative to the root) of the workspace member pubspec.yaml files. */
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
  // Script path relative to the project folder (front/microfrontends/<mf>).
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
      const kind = root.split('/')[1]; // apps, microfrontends, packages or tools
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
