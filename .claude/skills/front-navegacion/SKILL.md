---
name: front-navegacion
description: Navegación y enlaces profundos del front de node_template con go_router. Rutas declaradas por el manifiesto del microfrontend, go contra push, parámetros por ruta y query sin extra, guardias de acceso y retorno tras el login. Úsala al agregar una ruta, un enlace, un redirect o una llamada de navegación desde una pantalla.
paths:
  - 'front/packages/shell_core/**'
  - 'front/packages/shell_host/**'
  - 'front/microfrontends/*/lib/*.dart'
  - 'front/microfrontends/**/constants/**'
---

# Navegación

`go_router` ya lo usa el shell (`shell_core`). Los microfrontends no crean un `GoRouter` ni usan `Navigator` directamente: declaran `ScreenRoute` en su manifiesto (ADR 0018) y `buildShellRouter` arma el árbol.

## Reglas

- Las rutas de un microfrontend cuelgan de su id (`/tasks`, `/tasks/:id`, `/tasks/:id/edit`). Se construyen en una clase de constantes del microfrontend (`TasksPaths`) y las pantallas nunca escriben un path a mano.
- `context.go(TasksPaths.detail(id))` para cambiar de destino. `context.push` solo cuando la pantalla espera un resultado (`await context.push<bool>(...)`) o es un paso temporal sobre la actual. `context.pop` para volver.
- Los datos viajan en el path (`:id`) o en la query (`?status=done`). Nunca en `extra`: se pierde al recargar la web, en un deep link y al restaurar la app. `ScreenRoute` entrega ambos unidos en `params`, y gana el path.
- Un segmento que nombra una página (`new`, `edit`) no puede confundirse con un id: se declara en la clase de paths, como hace `TasksPaths`.
- Los segmentos usan minúsculas y guiones (`/audit-log`), no camelCase ni guion bajo.
- Subrutas anidadas como hijas de su ruta para que atrás funcione: `/tasks` tiene `:id`, y `:id` tiene `edit`.
- Un enlace de la app entra por `deepLinks` del manifiesto, que lo traduce a una ruta propia. Lo que viene de fuera (query, path) es dato no confiable: se valida y, si es inválido, se muestra la pantalla de error, no se lanza.
- El acceso se declara, no se programa en la pantalla: `ScreenRoute(access: ...)`, `redirect: accessRedirect(regla)` para una subruta, `AccessGate` o `context.can(regla)` para una acción. Una acción sensible llama a `scope.services.requestStepUp()`.
- Tras el login se vuelve al sitio de origen con `?from=`, validado por `return_location` de `shell_host` para no redirigir a un sitio externo.
- Después de un `await`, antes de navegar, se revisa `mounted` (ver `front-codigo`).
- Las transiciones respetan `disableAnimations` (ver `front-accesibilidad`).

## Ejemplo

```dart
Future<void> _save() async {
  try {
    final task = await widget.controller.save();
    if (!mounted) return;
    context.go(TasksPaths.detail(task.id));
  } on Exception catch (error) {
    if (!mounted) return;
    showActionError(context, error);
  }
}
```

## Pruebas

Las pantallas se prueban montando `manifest.buildRoutes(...)` en un `GoRouter` de prueba (ver `tasks_screens_test.dart`), y se verifica la ubicación final con `router.routeInformationProvider.value.uri`. Las redirecciones y guardias se prueban contra un `ShellAccessScope`.

## Descartado de las guías públicas

Rutas tipadas con `@TypedGoRoute` y `go_router_builder` exigen un generador de código. Las constantes de `*Paths` dan el mismo resultado sin dependencia nueva.
