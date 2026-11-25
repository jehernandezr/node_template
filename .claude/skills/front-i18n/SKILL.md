---
name: front-i18n
description: Internacionalización del front de node_template (Flutter). ARB por microfrontend y los compartidos de i18n, flutter gen-l10n, DeferredLocalizations y showLocalizedDialog para los diálogos, plurales, ErrorPresenter para los errores, placeholders y direccionalidad. Úsala al agregar o cambiar un texto visible, un idioma, una etiqueta de menú o un mensaje de error.
paths:
  - 'front/**/*.arb'
  - 'front/**/l10n/**'
  - 'front/packages/i18n/**'
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
- Un texto del servidor nunca se muestra. Se mapea el código del contrato: `ErrorPresenter(l10n).describe(error)` para el mensaje y el código de un error, `actionMessage(error)` para el texto de una acción. Ambos son de `i18n`, y `errorMessage(l10n, code)` de `i18n` da el texto de un código.
- El texto de un enum sale de una función con `switch` exhaustivo (`taskStatusLabel(l10n, status)`), para que un caso nuevo rompa la compilación hasta tener su texto.
- Plurales, género y números van en el ARB con la sintaxis ICU, no con `if (count == 1)` en Dart:

```json
"messagesCount": "{count, plural, =0{Sin mensajes} =1{1 mensaje} other{{count} mensajes}}",
"@messagesCount": { "placeholders": { "count": { "type": "int" } } }
```

- Fechas, horas y dinero: `DateFormat` y `NumberFormat` de `intl` con el locale del contexto, o los helpers de `front/packages/utils` (`dates`, `money`, `numbers`). Nunca concatenar partes a mano.
- Nada de concatenar frases ni de unirlas con separadores (`·`): `'${l10n.hello} $name'` rompe en otros idiomas. Se usa un placeholder: `"hello": "Hola, {name}"`, y el separador va dentro de la frase del ARB.
- Direccionalidad: `EdgeInsetsDirectional`, `AlignmentDirectional` y `start`/`end` en lugar de `left`/`right`, para que un idioma de derecha a izquierda funcione sin reescribir.
- Sin librerías de i18n de terceros. Flutter y `intl` bastan.

## Diálogos y hojas

Un diálogo o una hoja es una ruta del `Navigator`, hermana de la página, así que no hereda las localizaciones que la pantalla carga de forma diferida. La pantalla envuelve su contenido en `DeferredLocalizations` (de `shell_core`) y abre los diálogos con `showLocalizedDialog` o `showLocalizedSheet`, que son extensiones de `BuildContext` y reaplican los mismos delegados:

Ejemplo ilustrativo, la clave `deleteTitle` no existe en el código:

```dart
final confirmed = await context.showLocalizedDialog<bool>(
  builder: (context) => AlertDialog(
    title: Text(TasksLocalizations.of(context).deleteTitle),
  ),
);
```

Si no hay un `DeferredLocalizations` arriba, el helper lanza un `FlutterError` que dice qué falta.

## Agregar un texto

1. Escribe la clave en `app_es.arb` (con `@clave` y placeholders si los tiene) y en `app_en.arb`.
2. Regenera: `flutter gen-l10n` desde la carpeta del paquete o microfrontend. El resultado de `l10n/generated` se versiona y no se edita a mano.
3. Usa la clave en el widget y agrega o ajusta la prueba que busca el texto.

## Probar

Las pruebas buscan texto por la localización o por el literal en español, con `TestApp` de `test_utils` (`TestApp(delegates: const [TasksLocalizations.delegate])`), que instala los delegados compartidos y los del microfrontend. Una prueba de cada idioma soportado comprueba que cada clave se resuelve (`supportedLocales` de `i18n`).

## Con pstack

Carga primero `pstack-en-node-template`: dice cómo se lee una skill de pstack en Claude Code y qué regla manda cuando pstack y el repositorio no coinciden. Si el plugin no está instalado, esta sección no aplica.

- Los textos visibles, en es y en, pasan por `unslop`: sin relleno ni frases de IA, con el registro del producto.
- De `technical-writing` se toma la claridad de una idea por frase. Sus reglas de inglés global no se imponen al español.
