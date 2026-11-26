/**
 * Predicates over paths relative to the repository root ("/" separator).
 */
export class FrontPaths {
  static GENERATED =
    /\/(l10n\/generated|lib\/src\/generated|contracts\/lib\/src\/(?!core\/))/;

  /**
   * Tells whether a file is generated (localizations, generated sources, contracts), so no rule checks it.
   * @param {string} file Path from the repository root.
   * @returns {boolean} Whether it is generated.
   */
  static isGenerated(file) {
    return FrontPaths.GENERATED.test(file);
  }

  /**
   * Tells whether a file is Dart source.
   * @param {string} file Path from the repository root.
   * @returns {boolean} Whether it ends in `.dart`.
   */
  static isDart(file) {
    return file.endsWith('.dart');
  }

  /**
   * Tells whether a Dart file is library code of a package, that is under a `lib/` folder.
   * @param {string} file Path from the repository root.
   * @returns {boolean} Whether it is in `lib/`.
   */
  static isDartLib(file) {
    return FrontPaths.isDart(file) && /\/lib\//.test(file);
  }

  /**
   * Tells whether a Dart file is library code of a microfrontend.
   * @param {string} file Path from the repository root.
   * @returns {boolean} Whether it is under `front/microfrontends/<mf>/lib/`.
   */
  static isMicrofrontendLib(file) {
    return (
      FrontPaths.isDart(file) &&
      /^front\/microfrontends\/[^/]+\/lib\//.test(file)
    );
  }

  /**
   * Tells whether a Dart file is a screen of a microfrontend.
   * @param {string} file Path from the repository root.
   * @returns {boolean} Whether it is under `lib/src/screens/` of a microfrontend.
   */
  static isMicrofrontendScreen(file) {
    return (
      FrontPaths.isDart(file) &&
      /^front\/microfrontends\/[^/]+\/lib\/src\/screens\//.test(file)
    );
  }

  /**
   * Tells whether a Dart file is library code of the `ui` package.
   * @param {string} file Path from the repository root.
   * @returns {boolean} Whether it is under `front/packages/ui/lib/`.
   */
  static isUiLib(file) {
    return FrontPaths.isDart(file) && file.startsWith('front/packages/ui/lib/');
  }

  /**
   * Tells whether a file is the pubspec of a workspace member; the one at the root of `front/` is not.
   * @param {string} file Path from the repository root.
   * @returns {boolean} Whether it is a member pubspec.
   */
  static isMemberPubspec(file) {
    return /^front\/.+\/pubspec\.yaml$/.test(file);
  }
}
