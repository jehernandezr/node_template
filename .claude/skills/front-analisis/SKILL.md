---
name: front-analisis
description: Análisis estático, lints, formato y documentación del front de node_template (Dart). analysis_options, modo estricto, dart fix, supresiones, comentarios de documentación con /// y comprobación previa a integrar. Úsala al configurar o corregir el analizador, al suprimir un aviso, al documentar API pública o antes de dar por terminado un cambio.
paths:
  - 'front/**/analysis_options.yaml'
  - 'front/**/pubspec.yaml'
  - 'front/**/lib/**'
---

# Análisis estático y documentación

## Estado actual y meta

Cada paquete tiene su `analysis_options.yaml` con `include: package:flutter_lints/flutter.yaml` y los directorios de plataforma excluidos. La meta es endurecerlo, y se hace como un cambio propio con todos los paquetes en verde, no mezclado con una funcionalidad:

```yaml
include: package:flutter_lints/flutter.yaml

analyzer:
  language:
    strict-casts: true
    strict-inference: true
    strict-raw-types: true
  exclude:
    - build/**
    - '**/generated/**'
    - android/**
    - ios/**
    - web/**
    - windows/**
    - macos/**
    - linux/**

linter:
  rules:
    - always_declare_return_types
    - avoid_dynamic_calls
    - cancel_subscriptions
    - close_sinks
    - prefer_final_locals
    - prefer_final_fields
    - prefer_const_literals_to_create_immutables
    - unawaited_futures
    - public_member_api_docs
    - directives_ordering
    - sort_pub_dependencies
```

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

- API pública de los paquetes compartidos y de cada microfrontend lleva `///`. Lo privado, solo si el porqué no es evidente.
- Primera línea: una oración que resume y termina en punto, separada del resto por una línea `///` vacía.
- Propiedades con frase nominal (`/// Tasks of the current filter.`); booleanos con "Whether" (`/// Whether another page can be appended.`); métodos con verbo en tercera persona (`/// Loads the first page.`). Los comentarios de la API van en inglés, como en el resto del código; los textos de usuario, en el ARB.
- Parámetros, retorno y excepciones se tejen en la prosa. Sin etiquetas `@param`, `@return` ni `@throws`.
- Los símbolos van entre corchetes (`[TasksRepository]`); las palabras clave y literales entre comillas invertidas (`null`, `true`). Sin paréntesis en los enlaces.
- Un override que no cambia el contrato no repite la documentación. Con getter y setter, solo el getter se documenta.
- Los bloques de código llevan el lenguaje (` ```dart `).
- Los comentarios explican el porqué y el contrato, nunca el proceso ni la historia del cambio.

```dart
/// Appends the next page.
///
/// A failure leaves the list as it was and is rethrown for the screen to
/// report. Does nothing when [hasMore] is false or a page is already loading.
Future<void> loadMore() async { ... }
```
