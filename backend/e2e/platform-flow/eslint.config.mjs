import baseConfig, { allowAppImports } from '../../eslint.config.mjs';

export default [...baseConfig, allowAppImports(['**/*.ts'])];
