// Predicates over paths relative to the repository root ("/" separator).
export class FrontPaths {
  static GENERATED =
    /\/(l10n\/generated|lib\/src\/generated|contracts\/lib\/src\/(?!core\/))/;

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

  // Pubspec of a workspace member; the one at the root of front/ is excluded.
  static isMemberPubspec(file) {
    return /^front\/.+\/pubspec\.yaml$/.test(file);
  }
}
