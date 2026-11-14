import { RequestContext } from '../request-context.js';
import { RequestContextStore } from '../request-context-store.js';

describe('RequestContext (static shim)', () => {
  it('opens a context visible in the shared store', () => {
    RequestContext.run({ tenantId: 'tenant-shim' }, () => {
      expect(RequestContextStore.shared().current()?.tenantId).toBe(
        'tenant-shim',
      );
    });
  });

  it('is undefined outside a run', () => {
    expect(RequestContext.current()).toBeUndefined();
  });
});
