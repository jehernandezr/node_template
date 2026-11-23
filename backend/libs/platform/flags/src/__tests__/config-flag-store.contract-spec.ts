import { ConfigFlagStore } from '../config-flag-store.js';
import { runFlagStoreContract } from './utils/index.js';

runFlagStoreContract('ConfigFlagStore', (rules) => new ConfigFlagStore(rules));
