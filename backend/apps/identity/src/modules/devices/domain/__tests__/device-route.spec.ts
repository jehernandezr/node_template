import { DeviceRoute } from '../device-route.js';

const USER = '01941f29-7c00-7000-8000-000000000001';
const TENANT = '01941f29-7c00-7000-8000-000000000002';
const DEVICE = '01941f29-7c00-7000-8000-000000000003';

describe('DeviceRoute', () => {
  it('round-trips the user, the home tenant and the device', () => {
    const route = new DeviceRoute(
      { userId: USER, homeTenantId: TENANT },
      DEVICE,
    );

    expect(DeviceRoute.parse(route.format())).toEqual(route);
  });

  it.each([
    `dv2_${USER}_${TENANT}_${DEVICE}`,
    `dv1_${USER}_${TENANT}`,
    `dv1_x_${TENANT}_${DEVICE}`,
  ])('rejects %s', (text) => {
    expect(DeviceRoute.parse(text)).toBeUndefined();
  });
});
