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
