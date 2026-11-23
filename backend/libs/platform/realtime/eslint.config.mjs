import baseConfig, { allowIdentityContracts } from '../../../eslint.config.mjs';

export default [...baseConfig, allowIdentityContracts(['**/*.ts'])];
