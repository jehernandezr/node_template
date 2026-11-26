const { JestTestServers } = require('./jest.servers.cjs');

/**
 * Jest `globalSetup`: starts the servers the integration suites of this run share.
 * @returns {Promise<void>} Resolves once both servers accept connections.
 */
module.exports = async () => {
  const servers = new JestTestServers(process.env);
  globalThis[JestTestServers.GLOBAL_KEY] = servers;
  await servers.start();
};
