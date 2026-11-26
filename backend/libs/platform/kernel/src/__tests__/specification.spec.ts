import { Specification } from '../specification.js';

interface Invoice {
  readonly amountMinor: number;
  readonly overdue: boolean;
}

class LargeInvoiceSpecification extends Specification<Invoice> {
  override isSatisfiedBy(invoice: Invoice): boolean {
    return invoice.amountMinor >= 100_000;
  }
}

class OverdueInvoiceSpecification extends Specification<Invoice> {
  override isSatisfiedBy(invoice: Invoice): boolean {
    return invoice.overdue;
  }
}

const large = new LargeInvoiceSpecification();
const overdue = new OverdueInvoiceSpecification();

describe('Specification', () => {
  describe.each([
    [{ amountMinor: 250_000, overdue: true }, true, true, false],
    [{ amountMinor: 250_000, overdue: false }, false, true, false],
    [{ amountMinor: 5_000, overdue: true }, false, true, true],
    [{ amountMinor: 5_000, overdue: false }, false, false, true],
  ])('with invoice %j', (invoice, both, either, notLarge) => {
    it(`and gives ${String(both)}`, () => {
      expect(large.and(overdue).isSatisfiedBy(invoice)).toBe(both);
    });

    it(`or gives ${String(either)}`, () => {
      expect(large.or(overdue).isSatisfiedBy(invoice)).toBe(either);
    });

    it(`not gives ${String(notLarge)}`, () => {
      expect(large.not().isSatisfiedBy(invoice)).toBe(notLarge);
    });
  });

  it('composes combined rules', () => {
    const urgent = large.and(overdue).or(large.not().and(overdue.not()));

    expect(urgent.isSatisfiedBy({ amountMinor: 1, overdue: false })).toBe(true);
    expect(urgent.isSatisfiedBy({ amountMinor: 1, overdue: true })).toBe(false);
  });
});
