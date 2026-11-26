/** How lint-staged runs the guards over the staged files. */
class StagedGuards {
  static BACKEND_TS = /[\\/]backend[\\/].*\.ts$/;
  static TOOLING_JS =
    /[\\/](\.claude[\\/](skills|hooks|guards|impact)|front[\\/]tools)[\\/].*\.[cm]?js$/;
  static TEXT = /\.(ts|mjs|cjs|js|dart|md|ya?ml|json|tf|sh|py)$/;

  /**
   * Quotes paths for the shell.
   * @param {string[]} files Absolute paths.
   * @returns {string} The quoted list.
   */
  static quote(files) {
    return files.map((file) => `"${file}"`).join(' ');
  }

  /**
   * Commands for the JavaScript, TypeScript, JSON, Markdown and YAML files: ESLint with the backend rules and guards
   * or with the tooling rules, then Prettier, in order, so one file is never rewritten by two commands at once.
   * @param {string[]} files Staged files of the group.
   * @returns {string[]} The commands.
   */
  static scripts(files) {
    const backend = files.filter((file) => StagedGuards.BACKEND_TS.test(file));
    const tooling = files.filter((file) => StagedGuards.TOOLING_JS.test(file));
    return [
      ...(backend.length > 0
        ? [
            `pnpm --dir backend exec eslint --fix ${StagedGuards.quote(backend)}`,
          ]
        : []),
      ...(tooling.length > 0
        ? [
            `pnpm --dir backend exec eslint --config ../eslint.tooling.config.mjs ${StagedGuards.quote(tooling)}`,
          ]
        : []),
      `prettier --write ${StagedGuards.quote(files)}`,
    ];
  }

  /**
   * Commands that only read: the language check of every staged text file and the structure checks.
   * @param {string[]} files Staged text files.
   * @returns {string[]} The commands.
   */
  static checks(files) {
    const text = files.filter((file) => StagedGuards.TEXT.test(file));
    return [
      ...(text.length > 0
        ? [
            `node .claude/guards/check-language.mjs --files ${StagedGuards.quote(text)}`,
          ]
        : []),
      'node .claude/skills/backend-structure/scripts/check-structure.mjs --changed .',
      'node .claude/skills/front-structure/scripts/check-structure.mjs --changed .',
    ];
  }
}

export default {
  '*.{js,mjs,cjs,ts,json,md,yml,yaml}': StagedGuards.scripts,
  'front/**/*.dart': 'dart format',
  '*': StagedGuards.checks,
};
