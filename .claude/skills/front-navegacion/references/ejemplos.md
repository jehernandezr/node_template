# Ejemplos de front-navegacion

Ejemplos largos que la skill cita. Léelos solo cuando el tema te toque.

## Ejemplo

```dart
Future<void> _save() async {
  final result = await widget.controller.save();
  if (!mounted) return;
  if (result is ActionSucceeded<String>) {
    context.go(TasksPaths.detail(result.value));
    return;
  }
  showActionResult(context, result);
}
```
