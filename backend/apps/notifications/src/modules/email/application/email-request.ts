/** Un correo a enviar con una plantilla. `messageId` hace idempotente el envío. */
export interface EmailRequest {
  readonly messageId: string;
  readonly template: string;
  readonly to: string;
  readonly locale: string;
  readonly parameters: ReadonlyMap<string, string>;
}
