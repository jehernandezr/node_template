/** Los miembros facturables del tenant del `ShardScope` abierto, según los cambios de membresía de identity. */
export abstract class MemberRoster {
  abstract join(userId: string): Promise<void>;
  abstract leave(userId: string): Promise<void>;
  abstract count(): Promise<number>;
}
