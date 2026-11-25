// Each file goes through a single group of commands: lint-staged runs the different groups
// in parallel, so two globs that match one file could rewrite it at the same time.
const quote = (files) => files.map((file) => `"${file}"`).join(' ');
const isBackendTs = (file) => /[\\/]backend[\\/].*\.ts$/.test(file);

export default {
  // Backend TypeScript: first ESLint (backend/ configuration) and then Prettier, in order.
  // The rest: Prettier with the root configuration.
  '*.{js,mjs,cjs,ts,json,md,yml,yaml}': (files) => {
    const backendTs = files.filter(isBackendTs);
    return [
      ...(backendTs.length > 0
        ? [`pnpm --dir backend exec eslint --fix ${quote(backendTs)}`]
        : []),
      `prettier --write ${quote(files)}`,
    ];
  },
  // The front is formatted with the Dart tools.
  'front/**/*.dart': 'dart format',
};
