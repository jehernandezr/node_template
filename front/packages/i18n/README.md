# i18n

Textos en español (plantilla) e inglés, generados con `gen-l10n` desde `lib/l10n/*.arb`.

- `lib/src/generated/` contiene el código generado y se versiona, así otros paquetes compilan sin ejecutar el generador.
- `AppLocalizations`, `supportedLocales` y `errorMessage(l10n, code)` se exportan desde `lib/i18n.dart`. `errorMessage` devuelve el mensaje del código `PLATFORM.*` o el texto genérico `errorFallback` si el código no se conoce.
- Cada código de `PlatformErrorCode` tiene una clave `error_<código en minúsculas, con _>`, por ejemplo `error_platform_validation_invalid_input`.

- Las etiquetas de menú no viven aquí: cada microfrontend declara la suya en su manifiesto (`MenuLabel`), así este paquete no conoce los microfrontends. Solo `menuMore` es del shell.
- Las palabras compartidas (acciones como `confirm`, `delete`, `edit`, `close`, `back`, `search`, `loadMore`, `emptyListTitle`, y las etiquetas de la shell como `demoModeTitle`, `forbiddenTitle`, `goHome`, `loading`) viven en este paquete y se usan desde cualquier microfrontend.

Para regenerar: `flutter gen-l10n` dentro del paquete.

## Localización por microfrontend

Cada microfrontend localiza sus propios textos con el mismo patrón. Así sus cadenas viajan en su chunk diferido y el shell no las carga.

1. **Archivos propios.** El microfrontend tiene su `l10n.yaml` y sus ARB en `lib/src/l10n/` (plantilla `app_es.arb` y `app_en.arb`). Genera la clase `<Name>Localizations` dentro del paquete del microfrontend, y ese código generado se versiona para que otros paquetes compilen sin ejecutar el generador.
2. **Override en la pantalla diferida.** El builder de cada pantalla, que vive en la librería diferida, envuelve la pantalla con `Localizations.override` y el delegado del microfrontend. El shell no registra delegados de microfrontends:

   ```dart
   Widget buildTasksListScreen(MicrofrontendScope scope) => Builder(
     builder: (context) => Localizations.override(
       context: context,
       delegates: const [TasksLocalizations.delegate],
       child: TasksListScreen(repository: tasksRepositoryOf(scope)),
     ),
   );
   ```

3. **Etiqueta del menú.** Es lo único que el shell dibuja antes de cargar el microfrontend, así que va en el manifiesto como `MenuLabel` con un texto por idioma. El registro rechaza una etiqueta sin alguno de los `supportedLocales`.
4. **Palabras compartidas.** Los textos comunes (acciones, estados y errores de plataforma) salen de este paquete. El microfrontend no repite esas claves en sus ARB.

Un microfrontend solo añade claves propias en sus ARB. Si una palabra aparece en más de un microfrontend, se mueve a este paquete.
