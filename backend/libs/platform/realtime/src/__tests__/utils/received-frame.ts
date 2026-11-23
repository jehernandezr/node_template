/** Una trama tal como la recibe un cliente de prueba. */
export interface ReceivedFrame {
  readonly id: string;
  readonly type: string;
  readonly data: unknown;
}
