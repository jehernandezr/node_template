# i18n

Texts in Spanish (template) and English, generated with `gen-l10n` from `lib/l10n/*.arb`.

- `lib/src/generated/` holds the generated code and is committed, so other packages compile without running the generator.
- `AppLocalizations`, `supportedLocales` and `errorMessage(l10n, code)` are exported from `lib/i18n.dart`. `errorMessage` returns the message for the `PLATFORM.*` code or the generic `errorFallback` text if the code is unknown.
- Each `PlatformErrorCode` code has a key `error_<code in lowercase, with _>`, for example `error_platform_validation_invalid_input`.

- Menu labels do not live here: each microfrontend declares its own in its manifest (`MenuLabel`), so this package does not know the microfrontends. Only `menuMore` belongs to the shell.
- Shared words (actions such as `confirm`, `delete`, `edit`, `close`, `back`, `search`, `loadMore`, `emptyListTitle`, and shell labels such as `demoModeTitle`, `forbiddenTitle`, `goHome`, `loading`) live in this package and are used from any microfrontend.

To regenerate: `flutter gen-l10n` inside the package.

## Localization per microfrontend

Each microfrontend localizes its own texts with the same pattern. This way its strings ship in its deferred chunk and the shell does not load them.

1. **Own files.** The microfrontend has its `l10n.yaml` and its ARB files in `lib/src/l10n/` (template `app_es.arb` and `app_en.arb`). It generates the `<Name>Localizations` class inside the microfrontend package, and that generated code is committed so other packages compile without running the generator.
2. **Override in the deferred screen.** The builder of each screen, which lives in the deferred library, wraps the screen with `Localizations.override` and the microfrontend's delegate. The shell does not register microfrontend delegates:

   ```dart
   Widget buildTasksListScreen(MicrofrontendScope scope) => Builder(
     builder: (context) => Localizations.override(
       context: context,
       delegates: const [TasksLocalizations.delegate],
       child: TasksListScreen(repository: tasksRepositoryOf(scope)),
     ),
   );
   ```

3. **Menu label.** It is the only thing the shell draws before loading the microfrontend, so it goes in the manifest as a `MenuLabel` with one text per language. The registry rejects a label missing any of the `supportedLocales`.
4. **Shared words.** Common texts (actions, states and platform errors) come from this package. The microfrontend does not repeat those keys in its ARB files.

A microfrontend only adds its own keys in its ARB files. If a word appears in more than one microfrontend, it moves to this package.
