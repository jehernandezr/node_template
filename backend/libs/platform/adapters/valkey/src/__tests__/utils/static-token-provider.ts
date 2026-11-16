import { ValkeyAuthTokenProvider } from '../../valkey-auth-token-provider.js';

/** Proveedor de token fijo, el papel de `ElastiCacheIamAuthTokenProvider` en las pruebas. */
export class StaticTokenProvider extends ValkeyAuthTokenProvider {
  static readonly TOKEN = 'test-token';

  async token(): Promise<string> {
    return StaticTokenProvider.TOKEN;
  }
}
