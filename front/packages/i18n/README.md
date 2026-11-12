# i18n

Textos en español (plantilla) e inglés, generados con `gen-l10n` desde `lib/l10n/*.arb`.

- `lib/src/generated/` contiene el código generado y se versiona, así otros paquetes compilan sin ejecutar el generador.
- `AppLocalizations`, `supportedLocales` y `errorMessage(l10n, code)` se exportan desde `lib/i18n.dart`. `errorMessage` devuelve el mensaje del código `PLATFORM.*` o el texto genérico `errorFallback` si el código no se conoce.
- Cada código de `PlatformErrorCode` tiene una clave `error_<código en minúsculas, con _>`, por ejemplo `error_platform_validation_invalid_input`.

- `menuLabel(l10n, key)` traduce las claves `menuAccount`, `menuTasks`, `menuNotifications`, `menuAssistant`, `menuBilling`, `menuBackoffice` y `menuVerifier`. Una clave desconocida devuelve la propia clave.
- Las palabras compartidas (acciones como `confirm`, `delete`, `edit`, `close`, `back`, `search`, `loadMore`, `emptyListTitle`, y las etiquetas de la shell como `demoModeTitle`, `forbiddenTitle`, `goHome`, `loading`) viven en este paquete y se usan desde cualquier microfrontend.

Para regenerar: `flutter gen-l10n` dentro del paquete.

## Localización por microfrontend

Cada microfrontend localiza sus propios textos con el mismo patrón. Así sus cadenas viajan en su chunk diferido y el shell no las carga.

1. **Archivos propios.** El microfrontend tiene su `l10n.yaml` y sus ARB en `lib/l10n/` (plantilla `app_es.arb` y `app_en.arb`). Genera la clase `<Name>Localizations` con `output-dir` dentro del paquete del microfrontend, y ese código generado se versiona para que otros paquetes compilen sin ejecutar el generador.
2. **Delegado en el manifiesto.** El microfrontend expone su `LocalizationsDelegate` en su manifiesto, junto a sus rutas. El shell lo registra sin conocer sus claves.
3. **Override en la página diferida.** El backoffice aplica `Localizations.override` dentro de la página diferida (`deferred`), así sus cadenas quedan en el chunk diferido y no en el bundle principal:

   ```dart
   final page = await loadLibrary();
   return Localizations.override(
     context: context,
     delegates: [page.<Name>Localizations.delegate],
     child: page.buildScreen(),
   );
   ```

4. **Palabras compartidas.** Los textos comunes (acciones, estados, errores de plataforma y etiquetas de menú) salen de este paquete. El microfrontend no repite esas claves en sus ARB.

Un microfrontend solo añade claves propias en sus ARB. Si una palabra aparece en más de un microfrontend, se mueve a este paquete.
