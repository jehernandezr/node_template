/** Qué hace una ruta con la cookie de sesión del canal web. */
export enum SessionCookieMode {
  /** No toca la cookie. */
  None = 'none',
  /** Responde con la cookie nueva a partir del `sessionToken` que devolvió el caso de uso. */
  Issue = 'issue',
  /** Igual que `Issue`, pero si la respuesta no trae `sessionToken` deja la cookie como está. Además lee la cookie como entrada. */
  Rotate = 'rotate',
  /** Borra la cookie y lee la cookie como entrada. */
  Clear = 'clear',
}
