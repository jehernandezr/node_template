/** Un correo listo para enviar: remitente, un destinatario y el cuerpo en HTML y en texto. */
export interface OutboundEmail {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}
