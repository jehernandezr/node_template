---
name: front-rendimiento
description: Rendimiento de la interfaz del front de node_template (Flutter). const, reconstrucciones acotadas, listas con builder, tamaño de los chunks diferidos, trabajo pesado fuera del hilo de UI, imágenes y animaciones. Úsala al escribir o revisar widgets, listas, pantallas con muchos datos o cuando una pantalla se siente lenta.
paths:
  - 'front/**/lib/**'
---

# Rendimiento del front

Se optimiza lo que se mide y se evita lo que casi siempre sale mal. Estas reglas son baratas y se aplican siempre.

## En el código

- **`const`:** todo constructor de widget, `EdgeInsets`, `SizedBox` y `Icon` que pueda ser `const` lo es. El lint `prefer_const_constructors` lo pide.
- **Widgets como clases, no métodos:** un `Widget _buildHeader()` se reconstruye con su padre en cada `build`. Una clase `StatelessWidget` con constructor `const` se salta la reconstrucción si no cambian sus parámetros.
- **Reconstrucción acotada:** el `ListenableBuilder` envuelve la parte que cambia, no la pantalla entera. Un controlador que notifica seguido (escritura, progreso) se escucha en el widget más pequeño posible. El argumento `child` de `ListenableBuilder` y `AnimatedBuilder` pasa lo que no depende del estado.
- **`setState` mínimo:** en el `State` más bajo que lo necesita. Estado que varias partes comparten va al controlador.
- **`build` puro:** sin crear controladores, futuros, streams ni formateadores (`DateFormat`) dentro de `build`. Se crean en `initState` o en el controlador.
- **Listas:** `ListView.builder` o `.separated`, con `itemExtent` o `prototypeItem` cuando las filas miden lo mismo. `shrinkWrap: true` en una lista larga anula el perezoso: se evita. Una `Key` estable (`ValueKey(task.id)`) en filas que se reordenan o se borran.
- **Paginación:** listas del servidor con cursor (`TasksListController.loadMore`), no cargar todo.
- **Imágenes:** con `cacheWidth` o `cacheHeight` cuando se muestran más chicas que el original, y con `errorBuilder`. Un `Image.network` sin tamaño provoca saltos de layout.
- **Opacidad y recorte:** `Opacity`, `ClipRRect` y `saveLayer` son caros dentro de listas y animaciones; se prefiere un color con alfa y `DecoratedBox`.
- **Animaciones:** `AnimatedBuilder` o implícitas acotadas, con `RepaintBoundary` alrededor de lo que anima sin parar. Un indicador infinito no vive sobre toda la pantalla.
- **Trabajo pesado:** parseo de JSON grande o cálculo largo en `Isolate.run`, con una función que no capture un widget ni un `BuildContext`.
- **Entrada de texto:** la búsqueda mientras se escribe usa debounce inyectado (`TasksListController.search`) y descarta respuestas viejas.

## Carga diferida

- Pantallas, datos y textos de un microfrontend van en un chunk diferido (`deferred as`). El manifiesto solo importa constantes, enums y el ciclo de vida, y `check_deferred_chunks` lo vigila sobre el build web.
- Una dependencia pesada que solo usa un microfrontend (gráficas, editor) se importa desde su chunk, no desde un paquete compartido que todos cargan.
- La carga de un chunk muestra un estado (el `deferredPage` de `shell_core` ya lo hace) y un reintento si falla.

## Cómo se mide

- Sospecha antes de optimizar: Flutter DevTools (rendimiento, "Track widget rebuilds") en modo `--profile`, no en debug.
- Una optimización que se hace sin una medición se justifica con una de estas reglas; si no, se deja el código legible.
