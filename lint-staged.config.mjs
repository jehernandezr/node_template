export default {
  // Archivos del repositorio y del backend: Prettier con la configuración de la raíz.
  '*.{js,mjs,cjs,ts,json,md,yml,yaml}': 'prettier --write',
  // El backend se valida con su propio ESLint (workspace en backend/).
  'backend/**/*.ts': 'pnpm --dir backend exec eslint --fix',
  // El front se formatea con las herramientas de Dart.
  'front/**/*.dart': 'dart format',
};
