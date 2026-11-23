import { InMemoryUsageCounterStore } from '../in-memory-usage-counter-store.js';
import { runUsageCounterStoreContract } from './utils/index.js';

runUsageCounterStoreContract(
  'InMemoryUsageCounterStore',
  () => new InMemoryUsageCounterStore(),
);
