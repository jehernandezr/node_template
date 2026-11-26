import type { QueueDefinition } from '@contracts/platform';
import { AwsMessagingNames } from '@platform/adapters-aws';
import type { ConfigEnv } from '@platform/config';
import { InvalidServiceDefinitionError } from '../../errors/invalid-service-definition.error.js';

/** Environment variables that decide which queues a worker polls. */
enum ConsumedQueueVariable {
  QueueUrl = 'QUEUE_URL',
  NamePrefix = 'MESSAGING_NAME_PREFIX',
}

/**
 * Picks the contract queues a worker polls. A deployment runs one worker per queue and gives it `QUEUE_URL`, so the
 * worker polls only the queue whose physical name (`<MESSAGING_NAME_PREFIX>-<name>[.fifo]`) ends that URL. Without
 * `QUEUE_URL`, as in the local stack, one worker polls every queue of the contract.
 */
export class ConsumedQueueSelector {
  /**
   * Selects the queues to poll.
   * @param serviceName Service name, for the error.
   * @param queues Queues of the service contract.
   * @param env Environment variables.
   * @returns The queue of `QUEUE_URL`, or every queue when it is not set.
   * @throws InvalidServiceDefinitionError if `QUEUE_URL` is not a URL of a contract queue under `MESSAGING_NAME_PREFIX`.
   */
  select(
    serviceName: string,
    queues: Readonly<Record<string, QueueDefinition>>,
    env: ConfigEnv,
  ): QueueDefinition[] {
    const all = Object.values(queues);
    const queueUrl = env[ConsumedQueueVariable.QueueUrl]?.trim() ?? '';
    if (queueUrl === '') {
      return all;
    }
    const prefix = env[ConsumedQueueVariable.NamePrefix]?.trim() ?? '';
    const physicalName = ConsumedQueueSelector.lastSegment(queueUrl);
    const queue = all.find(
      (candidate) =>
        prefix !== '' &&
        AwsMessagingNames.physicalName(
          prefix,
          candidate.name,
          candidate.fifo,
        ) === physicalName,
    );
    if (queue === undefined) {
      throw new InvalidServiceDefinitionError(
        serviceName,
        `${ConsumedQueueVariable.QueueUrl} must be the URL of a queue of the contract named under ${ConsumedQueueVariable.NamePrefix}`,
      );
    }
    return [queue];
  }

  private static lastSegment(queueUrl: string): string | undefined {
    if (!URL.canParse(queueUrl)) {
      return undefined;
    }
    return new URL(queueUrl).pathname.split('/').pop();
  }
}
