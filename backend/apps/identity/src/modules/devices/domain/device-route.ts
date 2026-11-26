import type { UserRef } from '../../../shared/types/user-ref.type.js';

/**
 * Public id of a device, `dv1_<user>_<home tenant>_<device>`: with it a request without a
 * session reaches the user's shard. The app builds it from the `sub`, `htid` and `did` claims of its access token;
 * the proof that it is the device is the ES256 signature with its key, not the id.
 */
export class DeviceRoute {
  static readonly PREFIX = 'dv1';
  private static readonly UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  constructor(
    readonly user: UserRef,
    readonly deviceId: string,
  ) {}

  /**
   * Parses a device id of the form `dv1_<sub>_<htid>_<did>`.
   * @param text Device id.
   * @returns The route, or `undefined` when malformed.
   */
  static parse(text: string): DeviceRoute | undefined {
    const parts = text.split('_');
    if (parts.length !== 4 || parts[0] !== DeviceRoute.PREFIX) {
      return undefined;
    }
    const [, userId, homeTenantId, deviceId] = parts as [
      string,
      string,
      string,
      string,
    ];
    if (
      ![userId, homeTenantId, deviceId].every((id) => DeviceRoute.UUID.test(id))
    ) {
      return undefined;
    }
    return new DeviceRoute({ userId, homeTenantId }, deviceId);
  }

  /**
   * Formats the route as a device id.
   * @returns The device id.
   */
  format(): string {
    return [
      DeviceRoute.PREFIX,
      this.user.userId,
      this.user.homeTenantId,
      this.deviceId,
    ].join('_');
  }
}
