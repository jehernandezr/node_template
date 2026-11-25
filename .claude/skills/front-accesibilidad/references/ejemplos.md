# Ejemplos de front-accesibilidad

Ejemplos largos que la skill cita. Léelos solo cuando el tema te toque.

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
