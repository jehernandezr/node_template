---
name: front-accesibilidad
description: Accesibilidad de los widgets del front de node_template (Flutter, web y móvil). Semantics, nombres accesibles, tamaños táctiles de 48 en el tema, contraste, escala de texto, foco y teclado, animaciones y anuncios de cambios async, con las pruebas que lo fijan (expectAccessible y escala 2x). Úsala al crear, revisar o auditar pantallas, componentes de ui o formularios.
paths:
  - 'front/**/lib/**'
---

# Accesibilidad del front

El objetivo es WCAG 2.2 nivel AA en web, Android e iOS. Los componentes de `front/packages/ui` ya cumplen esta lista; una pantalla nueva o tocada la cumple por completo.

## Reglas

- **Acciones:** nunca un `GestureDetector` desnudo como botón. Se usan `AppButton`, `FilledButton`, `TextButton`, `IconButton` o `InkWell`, que reciben foco y teclado. Si hace falta un gesto propio, se envuelve en `Semantics(button: true, label: ..., onTap: ...)` y un `FocusableActionDetector`.
- **Nombre accesible:** un botón con solo icono lleva `tooltip` (que también sirve de etiqueta) o `Semantics(label:)`. Una `Image` informativa lleva `semanticLabel`; una decorativa, `excludeFromSemantics: true`. El texto sale del ARB.
- **Tamaño táctil:** el tema fija 48 de alto y ancho mínimo en botones (`FilledButton` y `OutlinedButton`) y en campos (`InputDecorationTheme`), en web y en móvil. Un icono de 24 se rodea de `IconButton` con `constraints` de 48, no se agranda el icono.
- **Contraste:** 4.5:1 para texto y 3:1 para texto grande y bordes de controles. Los colores salen de `ColorScheme` o de `context.statusColors` (ver `front-layout-adaptable`); si se define un par nuevo en `tokens`, se comprueba con `textContrastGuideline` o a mano.
- **Color no es el único canal:** un estado (error, hecho) lleva también icono o texto. Un estado de tarea se muestra con etiqueta, no solo con un color.
- **Escala de texto:** sin `SizedBox` ni `Container` de alto fijo alrededor de `Text`; se usa `ConstrainedBox(minHeight:)`. No se limita `textScaler` salvo en un elemento concreto y justificado. La interfaz tiene que sobrevivir a 2x sin overflow.
- **Foco y teclado:** todo lo accionable se alcanza con Tab y se activa con Enter o Espacio. El orden de foco sigue el orden visual. Un diálogo devuelve el foco a quien lo abrió. Un campo de texto declara `textInputAction` y, si es dato personal, `autofillHints`.
- **Arrastre:** todo gesto de arrastrar (`Dismissible`, reordenar) tiene un botón equivalente en la misma pantalla.
- **Cambios async:** `AsyncValueView` ya anuncia la carga y el error: `LoadingView` es un `Semantics` con `liveRegion` y su indicador lleva la etiqueta de carga, y `ErrorView` pone `liveRegion` sobre su mensaje. Un guardado o un aviso puntual que no pasa por esos widgets se anuncia con `Semantics(liveRegion: true, child: ...)` o con `SemanticsService.sendAnnouncement`.
- **Movimiento:** una animación que no es esencial se omite con `MediaQuery.disableAnimationsOf(context)`.
- **Grupos:** `MergeSemantics` solo para un par etiqueta y valor estáticos. Nunca `ExcludeSemantics` sobre algo accionable: quita el control del lector de pantalla.
- **Encabezados:** el título de `AppPage` sale en un `AppBar`, que ya lo expone como encabezado. Un título de sección propio dentro del cuerpo lleva `Semantics(header: true)`.
- **Formularios:** cada campo tiene `labelText` (no solo `hintText`), el error de validación se asocia al campo con `errorText` y es texto, no solo color.

## Ejemplo

```dart
IconButton(
  onPressed: onClose,
  tooltip: l10n.close,
  icon: const Icon(Icons.close),
  constraints: const BoxConstraints(minWidth: 48, minHeight: 48),
)

Semantics(
  liveRegion: true,
  child: Text(l10n.savedMessage),
)
```

## Comprobación

- Cada pantalla con acciones llama a `expectAccessible(tester)` de `test_utils`, que corre las guías de tamaño táctil de Android e iOS, de etiqueta y de contraste. Plantilla en `front-pruebas/references/pruebas-de-widgets.md`.
- Una prueba a 2x de escala de texto con `pumpAtTextScale` sin excepciones.
- Revisión manual, una vez por pantalla nueva: Tab recorre todo; en web, activar el lector de accesibilidad de Flutter y recorrer; en móvil, TalkBack y VoiceOver.

## Informe de una auditoría

Cada hallazgo lleva el criterio con su nombre (`2.5.8 Target Size (Minimum)`), severidad CRITICAL, MAJOR o MINOR, archivo, y la corrección como código Dart antes y después. Un hallazgo sin código de corrección no está terminado. Lo que no se puede decidir leyendo el código (contraste sin colores reales, orden del lector) va aparte como "fuera de alcance".
