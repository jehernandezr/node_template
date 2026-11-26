const { JestTestServers } = require('./jest.servers.cjs');

/**
 * Jest `globalTeardown`: stops the servers the `globalSetup` of this run started.
 * @returns {Promise<void>} Resolves once both containers are gone.
 */
module.exports = async () => {
  await globalThis[JestTestServers.GLOBAL_KEY]?.stop();
};
