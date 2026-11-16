import { StubDataSource } from './utils/stub-data-source.js';

describe('StubDataSource and StubQueryRunner', () => {
  it('runs a transaction on the stub runner', async () => {
    const ds = new StubDataSource('a');
    await ds.initialize();
    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    await qr.query('SELECT 1', []);
    await qr.commitTransaction();
    await qr.release();
    expect(ds.isInitialized).toBe(true);
    expect(ds.runners[0].calls).toEqual([
      'connect',
      'begin',
      'query SELECT 1 []',
      'commit',
      'release',
    ]);
    expect(qr.manager.queryRunner).toBe(qr);
  });
});
