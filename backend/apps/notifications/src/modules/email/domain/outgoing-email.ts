/** Un correo listo para el proveedor: remitente, un destinatario y el cuerpo en HTML y en texto. */
export interface OutgoingEmail {
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}
