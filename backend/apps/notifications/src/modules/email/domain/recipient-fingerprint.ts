/** Huella de una dirección de correo: identifica al destinatario en los registros sin guardar el correo. */
export abstract class RecipientFingerprint {
  abstract of(address: string): string;
}
