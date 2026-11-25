import { RecordingLogger } from '../../__tests__/utils/recording-logger.js';
import { SagaInstanceBuilder } from '../../__tests__/utils/saga-instance-builder.js';
import { SagaEventPublisher } from '../saga-event-publisher.js';
import { SagaEventKind } from '../../model/saga-event-kind.enum.js';

describe('SagaEventPublisher', () => {
  const instance = SagaInstanceBuilder.aSaga()
    .with({ lastErrorCode: 'X' })
    .build();

  it('delivers the event to each subscribed listener', () => {
    const publisher = new SagaEventPublisher();
    const received: string[] = [];
    publisher.subscribe((event) => {
      received.push(`${event.kind}:${event.sagaId}:${event.lastErrorCode}`);
    });

    publisher.publish(SagaEventKind.Completed, instance);

    expect(received).toEqual([`completed:${SagaInstanceBuilder.DEFAULT_ID}:X`]);
  });

  it('the function returned by subscribe removes the listener', () => {
    const publisher = new SagaEventPublisher();
    let count = 0;
    const unsubscribe = publisher.subscribe(() => {
      count += 1;
    });

    publisher.publish(SagaEventKind.Completed, instance);
    unsubscribe();
    publisher.publish(SagaEventKind.Completed, instance);

    expect(count).toBe(1);
  });

  it('ignores listeners that throw or reject and logs them', async () => {
    const logger = new RecordingLogger();
    const publisher = new SagaEventPublisher(logger);
    publisher.subscribe(() => {
      throw new Error('sync');
    });
    publisher.subscribe(() => Promise.reject(new Error('async')));

    publisher.publish(SagaEventKind.Completed, instance);
    await new Promise((resolve) => setImmediate(resolve));

    expect(logger.at('warn')).toHaveLength(2);
  });
});
