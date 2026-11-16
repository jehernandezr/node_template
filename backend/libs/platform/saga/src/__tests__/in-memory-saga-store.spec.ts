import { InMemorySagaStore } from './utils/in-memory-saga-store.js';
import { runSagaStoreContract } from './utils/saga-store-contract.js';

runSagaStoreContract('InMemorySagaStore', async () => {
  let store = new InMemorySagaStore();
  return {
    get store() {
      return store;
    },
    within: (body) => body(),
    reset: async () => {
      store = new InMemorySagaStore();
    },
  };
});
