/**
 * Tipo de un valor que viaja en la query de una ruta GET o DELETE. Define cómo
 * se convierte el texto recibido antes de validarlo con el esquema del contrato.
 */
export enum QueryValueKind {
  String = 'string',
  Number = 'number',
  Boolean = 'boolean',
}
