// Cada archivo pasa por un solo grupo de comandos: lint-staged corre en paralelo los grupos
// distintos, así que dos globs que coinciden en un archivo podrían reescribirlo a la vez.
const quote = (files) => files.map((file) => `"${file}"`).join(' ');
const isBackendTs = (file) => /[\\/]backend[\\/].*\.ts$/.test(file);

export default {
  // TypeScript del backend: primero ESLint (workspace en backend/) y luego Prettier, en orden.
  // El resto: Prettier con la configuración de la raíz.
  '*.{js,mjs,cjs,ts,json,md,yml,yaml}': (files) => {
    const backendTs = files.filter(isBackendTs);
    return [
      ...(backendTs.length > 0
        ? [`pnpm --dir backend exec eslint --fix ${quote(backendTs)}`]
        : []),
      `prettier --write ${quote(files)}`,
    ];
  },
  // El front se formatea con las herramientas de Dart.
  'front/**/*.dart': 'dart format',
};
