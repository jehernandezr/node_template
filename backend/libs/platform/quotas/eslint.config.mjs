import baseConfig, { allowBillingContracts } from '../../../eslint.config.mjs';

export default [...baseConfig, allowBillingContracts(['**/*.ts'])];
