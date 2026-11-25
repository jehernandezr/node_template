import { DispatchHarness } from '../../__tests__/utils/index.js';

describe('LocalDispatchFacade', () => {
  it('notifies through the use case and returns its channels', async () => {
    const harness = new DispatchHarness();

    const channels = await harness.facade.notify(harness.command());

    expect(channels.length).toBeGreaterThan(0);
    expect(harness.inbox.stored.size).toBe(1);
  });

  it('erases the deliveries of the user and counts them', async () => {
    const harness = new DispatchHarness();
    await harness.facade.notify(harness.command());
    const before = harness.deliveries.all().length;

    const erased = await harness.facade.eraseUser(DispatchHarness.ANA);

    expect(erased).toBe(before);
    expect(harness.deliveries.all()).toEqual([]);
  });

  it('erases nothing when repeated', async () => {
    const harness = new DispatchHarness();
    await harness.facade.notify(harness.command());
    await harness.facade.eraseUser(DispatchHarness.ANA);

    await expect(harness.facade.eraseUser(DispatchHarness.ANA)).resolves.toBe(
      0,
    );
  });
});
