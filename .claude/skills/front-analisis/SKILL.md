---
name: front-analisis
description: 'Analizador, lints, formato y supresiones del front Dart. Úsala al configurar analysis_options o corregir avisos.'
paths:
  - 'front/**/analysis_options.yaml'
  - 'front/**/pubspec.yaml'
---

# Análisis estático y documentación

## Estado actual y meta

Cada paquete tiene su `analysis_options.yaml` con `include: package:flutter_lints/flutter.yaml` y los directorios de plataforma excluidos. La meta es endurecerlo, y se hace como un cambio propio con todos los paquetes en verde, no mezclado con una funcionalidad:

Ejemplo en `references/ejemplos.md`, sección "Estado actual y meta".

- `flutter_lints` ya trae `avoid_print`, `prefer_const_constructors` y `use_build_context_synchronously`; la lista de arriba agrega lo que le falta. Con `include`, una lista de reglas en `linter.rules` agrega; para apagar una se usa el formato de mapa (`regla: false`). No se mezclan lista y mapa en el mismo bloque.
- `public_member_api_docs` se aplica a los paquetes compartidos (`front/packages`) y se deja fuera de pantallas privadas de un microfrontend.
- Ningún `// ignore:` sin una línea que explique por qué, y siempre del código concreto (`// ignore: use_build_context_synchronously`), nunca `ignore_for_file: type=lint`. El código generado se excluye en `analyzer.exclude`.

## Antes de dar por terminado un cambio

1. `dart format` sobre lo tocado (`format-check` de Nx lo verifica).
2. `dart analyze` del paquete, o `analyze` de Nx. Cero avisos, incluidos los `info`; con `--fatal-infos` si se quiere forzar.
3. `dart fix --dry-run` y, si las correcciones son las esperadas, `dart fix --apply`, y se vuelve a analizar.
4. `flutter test` del paquete.
5. Para un microfrontend, `dart run tools/check_microfrontend_boundaries.dart`.

## Documentación con `///`

Las reglas están en `front-codigo`, sección "Documentación con `///`".

## Con pstack

Método en `pstack-en-node-template`. De pstack aplican aquí: `principle-encode-lessons-in-structure`, `correct`, `no-comments`, `unslop`, `principle-prove-it-works`.
