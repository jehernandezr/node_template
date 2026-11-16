import { InMemoryAuthState } from './utils/in-memory-auth-state.js';
import { runAuthStateContract } from './utils/auth-state-contract.js';

runAuthStateContract('InMemoryAuthState', () => {
  const state = new InMemoryAuthState();
  return { reader: state, writer: state, feed: state };
});
