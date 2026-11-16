// Predicados sobre rutas relativas a la raíz del repositorio (separador "/").
export class FrontPaths {
  static GENERATED = /\/(l10n\/generated|contracts\/lib\/src\/(?!core\/))/;

  static isGenerated(file) {
    return FrontPaths.GENERATED.test(file);
  }

  static isDart(file) {
    return file.endsWith('.dart');
  }

  static isDartLib(file) {
    return FrontPaths.isDart(file) && /\/lib\//.test(file);
  }

  static isMicrofrontendLib(file) {
    return (
      FrontPaths.isDart(file) &&
      /^front\/microfrontends\/[^/]+\/lib\//.test(file)
    );
  }

  static isMicrofrontendScreen(file) {
    return (
      FrontPaths.isDart(file) &&
      /^front\/microfrontends\/[^/]+\/lib\/src\/screens\//.test(file)
    );
  }

  static isUiLib(file) {
    return FrontPaths.isDart(file) && file.startsWith('front/packages/ui/lib/');
  }

  // Pubspec de un miembro del workspace; el de la raíz de front/ queda fuera.
  static isMemberPubspec(file) {
    return /^front\/.+\/pubspec\.yaml$/.test(file);
  }
}
