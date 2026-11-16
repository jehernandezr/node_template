import { SdkClientCredentialsProvider } from '../sdk-client-credentials-provider.js';
import { FakeSqsClient } from './utils/fake-sqs-client.js';

describe('SdkClientCredentialsProvider', () => {
  it('resolves the credentials the SDK client signs with', async () => {
    const provider = new SdkClientCredentialsProvider(new FakeSqsClient());

    const credentials = await provider.resolve();

    expect(credentials).toMatchObject(FakeSqsClient.CREDENTIALS);
  });
});
