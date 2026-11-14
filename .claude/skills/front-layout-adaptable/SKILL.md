---
name: front-layout-adaptable
description: Layout adaptable y tema del front de node_template (Flutter). Breakpoint, PlatformScreen y AppPage de ui, restricciones de ancho, tokens de espaciado y color, ColorScheme y TextTheme, modo claro y oscuro. Úsala al construir o revisar la presentación de una pantalla, al elegir tamaños, colores o tipografía, o al arreglar un overflow.
paths:
  - 'front/packages/ui/**'
  - 'front/packages/tokens/**'
  - 'front/**/screens/**'
---

# Layout adaptable y tema

La web y el móvil comparten pantallas, así que el layout responde al espacio que hay, no al dispositivo.

## Layout

- La decisión se toma con el ancho disponible: `Breakpoint.of(context)` (compact menos de 600, medium hasta 1024, expanded desde 1024) o `LayoutBuilder` para el ancho de un contenedor. No se pregunta por "teléfono" o "tablet", ni por plataforma, ni con `OrientationBuilder` en lo alto del árbol.
- Una pantalla con versiones distintas por ancho usa `PlatformScreen(compact:, medium:, expanded:)`. Falta una versión, cae a la más chica.
- Cada pantalla es dueña de una sola barra superior con `AppPage` (ADR 0018). El shell dibuja el marco con `AdaptiveScaffold` y `ShellChrome`.
- Un contenido de lectura no se estira en pantallas anchas: `Center` más `ConstrainedBox(maxWidth: ...)`. Una lista que crece con el ancho pasa a `GridView` con `SliverGridDelegateWithMaxCrossAxisExtent`.
- `Expanded` y `Flexible` reparten el espacio de un `Row` o `Column`. Un `Text` dentro de un `Row` va en `Expanded` o `Flexible` para que no desborde.
- Una lista de largo desconocido es `ListView.builder` o `ListView.separated`. Un `Column` dentro de `SingleChildScrollView` es solo para contenido corto y fijo.
- No se bloquea la orientación. El contenido respeta `SafeArea` y los insets del teclado (`Scaffold` con `resizeToAvoidBottomInset`).
- Entrada de varios tipos: lo accionable funciona con toque, ratón y teclado (ver `front-accesibilidad`); en ancho `expanded` se agregan atajos solo cuando aportan.
- Un overflow no se tapa con `SingleChildScrollView` ni se oculta en las pruebas: se arregla la restricción. Una prueba por ancho lo vigila (ver `front-pruebas`).

## Tema y tokens

- La única fuente de color, tipografía, espaciado y radios es `front/packages/tokens` (`AppSpacing`, `AppRadius`, `AppTypeScale`, `AppColors`, que reflejan `design-tokens.json`) a través de `AppTheme` de `ui`.
- En un widget: `Theme.of(context).colorScheme` y `Theme.of(context).textTheme`. Nunca `Colors.red`, `Color(0xFF...)`, `TextStyle(fontSize: ...)` ni números sueltos de padding. Un espacio es `AppSpacing.md`, un radio `AppRadius.md`.
- `copyWith` sobre un estilo del tema solo cambia un rol de color, no tamaño ni peso.
- Estilos repetidos van al tema (`FilledButtonThemeData`, `InputDecorationTheme` en `AppTheme`), no a un wrapper ni a una constante de decoración que cada llamada tiene que recordar usar.
- Claro y oscuro salen de `AppTheme.light()` y `AppTheme.dark()`. Ningún widget pregunta por `Brightness` ni hace `isDark ? a : b`: si falta un color, se agrega un rol al `ColorScheme`.
- Para márgenes y alineación se usan `EdgeInsetsDirectional` y `AlignmentDirectional` (ver `front-i18n`), y `EdgeInsets.only` o `.symmetric` en lugar de `fromLTRB`.
- Un valor de diseño nuevo se agrega primero a `design-tokens.json` y a `tokens`, no al widget que lo necesita.

## Ejemplo

```dart
Widget build(BuildContext context) {
  final theme = Theme.of(context);
  return Center(
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 720),
      child: Padding(
        padding: const EdgeInsetsDirectional.all(AppSpacing.md),
        child: Text(
          title,
          style: theme.textTheme.titleLarge?.copyWith(
            color: theme.colorScheme.onSurface,
          ),
        ),
      ),
    ),
  );
}
```
