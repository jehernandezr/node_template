/// Secciones de la cuenta. [segment] es el tramo de ruta bajo `/account`;
/// la visión general no tiene tramo.
enum AccountSection {
  overview(''),
  sessions('sessions'),
  devices('devices'),
  security('security'),
  agreements('agreements');

  const AccountSection(this.segment);

  /// Tramo de la ruta, vacío para [overview].
  final String segment;
}

/// Partes de la cuenta que dependen de que el repositorio las sepa servir.
/// Sesiones y dispositivos (listar y revocar sesiones) tienen contrato y
/// siempre están; las demás, solo donde existe la operación.
enum AccountCapability {
  /// Nombre, email y organización.
  profile,

  /// Retirar la confianza de un dispositivo.
  deviceTrust,

  /// Segundo factor, passkeys y códigos de recuperación.
  security,

  /// Acuerdos pendientes y aceptados.
  agreements,
}
