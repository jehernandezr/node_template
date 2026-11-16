import { AwsClientFactory } from '../aws-client-factory.js';

describe('AwsClientFactory', () => {
  const factory = new AwsClientFactory();

  it('points the clients at the LocalStack endpoint when one is set', async () => {
    const sns = factory.sns({
      AWS_REGION: 'us-east-1',
      AWS_ENDPOINT_URL: 'http://localhost:4566',
    });
    const sqs = factory.sqs({
      AWS_REGION: 'us-east-1',
      AWS_ENDPOINT_URL: 'http://localhost:4566',
    });

    expect(await sns.config.endpoint?.()).toMatchObject({
      hostname: 'localhost',
      port: 4566,
    });
    expect(await sqs.config.endpoint?.()).toMatchObject({
      hostname: 'localhost',
      port: 4566,
    });
    expect(await sqs.config.region()).toBe('us-east-1');

    sns.destroy();
    sqs.destroy();
  });

  it('leaves the endpoint to the SDK when none is set', async () => {
    const sqs = factory.sqs({ AWS_REGION: 'eu-west-1' });

    expect(await sqs.config.region()).toBe('eu-west-1');
    expect(sqs.config.endpoint).toBeUndefined();

    sqs.destroy();
  });
});
