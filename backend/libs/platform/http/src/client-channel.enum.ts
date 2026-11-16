/** Canal por el que habla el cliente: decide dónde viaja el session token. */
export enum ClientChannel {
  /** Navegador: el session token viaja solo en la cookie. */
  Web = 'web',
  /** App nativa: el session token viaja en el cuerpo. */
  Native = 'native',
}
