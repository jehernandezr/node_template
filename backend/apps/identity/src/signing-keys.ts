import { AwsClientFactory } from '@platform/adapters-aws';
import { SigningKeysTask } from './modules/tokens/index.js';

/**
 * Fills the empty signing-key secret of identity: a deployment step after the first `service-base` apply and before
 * the `service` apply. A secret that already holds keys stays as it is.
 */
const task = new SigningKeysTask(new AwsClientFactory());
try {
  const result = await task.run(process.env);
  console.log(JSON.stringify({ signingKeys: result }));
  process.exitCode = 0;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
