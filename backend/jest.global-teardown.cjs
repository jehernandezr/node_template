const { JestTestServers } = require('./jest.servers.cjs');
const { JestTempFolder } = require('./jest.temp-folder.cjs');

/**
 * Jest `globalTeardown`: stops the servers the `globalSetup` of this run started, then removes the suites' temporary
 * folder and fails the run when they left files in it.
 * @returns {Promise<void>} Resolves once both containers are gone.
 */
module.exports = async () => {
  await globalThis[JestTestServers.GLOBAL_KEY]?.stop();
  new JestTempFolder(process.env).closeOrFail();
};
