import baseConfig, { allowServiceNameImport } from '../../eslint.config.mjs';

export default [...baseConfig, allowServiceNameImport(['**/*.ts'])];
