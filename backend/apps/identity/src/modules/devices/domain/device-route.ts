import type { UserRef } from '../../../shared/types/user-ref.type.js';

/**
 * Id público de un dispositivo, `dv1_<usuario>_<tenant de origen>_<dispositivo>`: con él una petición sin
 * sesión llega al shard del usuario. La app lo arma con los claims `sub`, `htid` y `did` de su access token;
 * la prueba de que es el dispositivo es la firma ES256 con su clave, no el id.
 */
export class DeviceRoute {
  static readonly PREFIX = 'dv1';
  private static readonly UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  constructor(
    readonly user: UserRef,
    readonly deviceId: string,
  ) {}

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

  format(): string {
    return [
      DeviceRoute.PREFIX,
      this.user.userId,
      this.user.homeTenantId,
      this.deviceId,
    ].join('_');
  }
}
