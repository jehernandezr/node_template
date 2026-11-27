import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ServiceName } from '../service-name.mjs';

describe('ServiceName', () => {
  it('gives a two-word service its kebab-case folder and its snake_case Terraform name', () => {
    const name = new ServiceName('order-history');

    assert.equal(name.folder, 'order-history');
    assert.equal(name.terraform, 'order_history');
  });

  it('keeps a one-word service the same in both forms', () => {
    const name = new ServiceName('billing');

    assert.equal(name.folder, 'billing');
    assert.equal(name.terraform, 'billing');
  });

  it('finds the folder of a Terraform service_name', () => {
    assert.equal(
      ServiceName.fromTerraform('order_history').folder,
      'order-history',
    );
  });

  it('rejects a folder that is not kebab-case', () => {
    for (const folder of [
      'order_history',
      'Order-history',
      'order--history',
      '-order',
    ]) {
      assert.throws(() => new ServiceName(folder), /not kebab-case/);
    }
  });

  it('rejects a service_name that is not snake_case', () => {
    for (const serviceName of ['order-history', 'order__history', '_order']) {
      assert.throws(
        () => ServiceName.fromTerraform(serviceName),
        /not snake_case/,
      );
    }
  });
});
