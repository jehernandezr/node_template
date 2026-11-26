#!/usr/bin/env node
/**
 * PostToolUse for Write and Edit: formats the file just written with the repository tool
 * (Prettier or dart format). Never blocks: without a formatter it does nothing.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

class FileFormatter {
  static PRETTIER_EXTENSIONS = /\.(ts|mts|cts|js|mjs|cjs|json|md|ya?ml)$/;

  constructor(input) {
    this.input = input;
  }

  run() {
    const target = this.input.tool_input?.file_path;
    if (!target) return;
    const cwd = this.input.cwd ?? process.cwd();
    const file = isAbsolute(target) ? target : resolve(cwd, target);
    if (!existsSync(file)) return;
    const root = this.repositoryRoot(cwd);
    if (file.endsWith('.dart')) {
      spawnSync('dart', ['format', file], { cwd: root, stdio: 'ignore' });
      return;
    }
    if (!FileFormatter.PRETTIER_EXTENSIONS.test(file)) return;
    const prettier = join(root, 'node_modules', '.bin', 'prettier');
    if (existsSync(prettier)) {
      spawnSync(prettier, ['--write', '--log-level', 'silent', file], {
        cwd: root,
        stdio: 'ignore',
      });
    }
  }

  repositoryRoot(cwd) {
    try {
      return execFileSync('git', ['rev-parse', '--show-toplevel'], {
        cwd,
        encoding: 'utf8',
      }).trim();
    } catch {
      return cwd;
    }
  }
}

new FileFormatter(JSON.parse(readFileSync(0, 'utf8') || '{}')).run();
