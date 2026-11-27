const { JestTestServers } = require('./jest.servers.cjs');
const { JestTempFolder } = require('./jest.temp-folder.cjs');

/**
 * Jest `globalSetup`: starts the servers the integration suites of this run share, then gives the suites a
 * temporary folder of their own.
 * @returns {Promise<void>} Resolves once both servers accept connections.
 */
module.exports = async () => {
  const servers = new JestTestServers(process.env);
  globalThis[JestTestServers.GLOBAL_KEY] = servers;
  await servers.start();
  new JestTempFolder(process.env).open();
};
