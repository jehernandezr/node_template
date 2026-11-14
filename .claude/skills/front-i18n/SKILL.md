---
name: front-i18n
description: Internacionalización del front de node_template (Flutter). ARB por microfrontend y los compartidos de i18n, flutter gen-l10n, plurales, textos de errores y enums, direccionalidad y qué no se localiza. Úsala al agregar o cambiar un texto visible, un idioma, una etiqueta de menú o un mensaje de error.
---

# Internacionalización

## Dónde vive cada texto

- **Textos compartidos** (acciones, errores del catálogo, etiquetas de `ui`): `front/packages/i18n/lib/l10n/app_es.arb` y `app_en.arb`, clase `AppLocalizations`.
- **Textos de un microfrontend:** `lib/src/l10n/app_es.arb` y `app_en.arb`, con su clase propia (`TasksLocalizations`). Cuelgan de `l10n/` dentro del chunk diferido, así un cliente no descarga los textos de un microfrontend que no usa.
- **Etiqueta de menú:** `MenuLabel({'es': ..., 'en': ...})` en el manifiesto, porque el shell la dibuja antes de cargar el microfrontend. Es la única excepción.
- La plantilla es `app_es.arb`; cada clave existe en todos los idiomas soportados.

## Reglas

- Ningún texto visible en un literal de Dart: ni `Text('Guardar')`, ni `tooltip`, ni `semanticLabel`, ni mensajes de error. Todo sale de la localización: `TasksLocalizations.of(context).save`.
- Un widget compartido de `ui` no lee `AppLocalizations` si recibe el texto por parámetro; los que sí lo leen (`ErrorView`, `showActionError`) lo declaran en su documentación y exigen el delegado.
- Un texto del servidor nunca se muestra. Se mapea el código del contrato: `errorMessage(l10n, code)` o `actionErrorMessage` de `ui`.
- El texto de un enum sale de una función con `switch` exhaustivo (`taskStatusLabel(l10n, status)`), para que un caso nuevo rompa la compilación hasta tener su texto.
- Plurales, género y números van en el ARB con la sintaxis ICU, no con `if (count == 1)` en Dart:

```json
"messagesCount": "{count, plural, =0{Sin mensajes} =1{1 mensaje} other{{count} mensajes}}",
"@messagesCount": { "placeholders": { "count": { "type": "int" } } }
```

- Fechas, horas y dinero: `DateFormat` y `NumberFormat` de `intl` con el locale del contexto, o los helpers de `front/packages/utils` (`dates`, `money`, `numbers`). Nunca concatenar partes a mano.
- Nada de concatenar frases: `'${l10n.hello} $name'` rompe en otros idiomas. Se usa un placeholder: `"hello": "Hola, {name}"`.
- Direccionalidad: `EdgeInsetsDirectional`, `AlignmentDirectional` y `start`/`end` en lugar de `left`/`right`, para que un idioma de derecha a izquierda funcione sin reescribir.
- Sin librerías de i18n de terceros. Flutter y `intl` bastan.

## Agregar un texto

1. Escribe la clave en `app_es.arb` (con `@clave` y placeholders si los tiene) y en `app_en.arb`.
2. Regenera: `flutter gen-l10n` desde la carpeta del paquete o microfrontend. El resultado de `l10n/generated` se versiona y no se edita a mano.
3. Usa la clave en el widget y agrega o ajusta la prueba que busca el texto.

## Probar

Las pruebas buscan texto por la localización o por el literal en español, con `pumpApp` que instala los delegados. Una prueba de cada idioma soportado comprueba que cada clave se resuelve (`supportedLocales`).
