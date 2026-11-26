import { ValkeyAuthTokenProvider } from '../../valkey-auth-token-provider.js';

/** Fixed token provider, playing the role of `ElastiCacheIamAuthTokenProvider` in the tests. */
export class StaticTokenProvider extends ValkeyAuthTokenProvider {
  static readonly TOKEN = 'test-token';

  override async token(): Promise<string> {
    return StaticTokenProvider.TOKEN;
  }
}
