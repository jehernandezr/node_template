/** Asunto y cuerpos de un correo ya armado con sus datos. */
export interface RenderedEmail {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}
