---
name: backend-codigo-enterprise
description: 'Reglas transversales del backend (TypeScript, NestJS): clases e inyección, hexagonal, nombres, comentarios y reglas de revisión. Puerta de entrada de las skills backend-*.'
paths:
  - 'backend/**'
---

# Código enterprise del backend

Al crear archivos, carpetas, librerías o apps, carga `backend-estructura`; al tocar módulos, controllers o consumidores, `backend-nestjs-composicion`.

## Mapa de skills

- Carpetas, alias, compilado, nombres de archivo: `backend-estructura`.
- Agregados, objetos de valor, eventos de dominio: `backend-dominio`.
- Casos de uso, módulos NestJS, tokens, controllers: `backend-nestjs-composicion`.
- Errores, códigos, Problem Details: `backend-errores`.
- Entidades, repositorios, transacciones, migraciones: `backend-persistencia-typeorm`.
- Outbox, consumidores, idempotencia, colas: `backend-mensajeria-idempotencia`.
- Autenticación, autorización, entrada, secretos: `backend-seguridad`.
- Config, logs, trazas, health, apagado: `backend-observabilidad-configuracion`.
- Pruebas: `backend-pruebas`.

## Clases e inyección

- Todo comportamiento va en una clase con una responsabilidad. Nada de funciones sueltas que se llaman entre sí. Ejemplo en `references/clases.md`.
- Colaboradores por constructor como `private readonly`, tipados con el puerto.
- Herencia solo para `DomainError`, `AggregateRoot`, `ValueObject` y bases estables como `ShardedRepository`.
- Sin `new` de dependencias en negocio: se arman en el módulo NestJS (ver `backend-nestjs-composicion`).
- Sin singletons, estado de módulo ni efectos al importar.
- Funciones exportadas solo las que admite `check-structure.mjs` (ver `backend-estructura`).
- Tiempo e ids inyectados (`Clock`, `IdGenerator`). Nunca `Date.now()`, `new Date()` ni `randomUUID()` en negocio.

## Hexagonal

- `domain/`: agregados, objetos de valor, eventos, errores y puertos. Solo depende de `@platform/kernel`.
- `application/`: un caso de uso por clase con `execute`, comandos, consultas, fachadas. Depende de `domain/`.
- `infrastructure/`: adaptadores de los puertos (TypeORM, HTTP, colas, mappers).
- `presentation/`: controllers, consumidores, esquemas de entrada y módulo NestJS.
- Un módulo no importa el interior de otro: usa su fachada o sus eventos.
- Puertos como clases abstractas, pequeños y con el lenguaje del dominio (`UserRepository.findByEmail`, no `findBy(filter: any)`).
- I/O, aleatoriedad o librerías de propósito general entran al núcleo solo detrás de un puerto.

## Nombres y código

- Sin abreviaturas ni sufijos vacíos (`Manager`, `Helper`, `Util`, `Data`). Detalle en `references/nombres.md`.
- Sin parámetros booleanos de comportamiento: dos métodos o un enum. Más de tres parámetros: un objeto con nombre.
- Enums para eventos, errores, permisos, colas, jobs y estados. Nunca literales sueltos.
- Constantes numéricas con nombre (`MAX_SIGN_IN_ATTEMPTS`).
- Un archivo, una clase pública, con sufijo de rol. Nada de `util.ts`, `types.ts`, `limits.ts`, `model.ts`.
- Las clases de error terminan en `Error`.
- No se atrapa un error para callarlo (ver `backend-errores`).

## Comentarios y JSDoc

- Sin comentarios en línea (`//` ni `/* */`). Si hace falta uno, se renombra o se extrae un método.
- JSDoc en español, completo y conciso, en cada método público y de puerto: resumen, `@param`, `@returns`, `@throws` con su código.
- Clase pública: una línea de JSDoc con su rol. Métodos privados sin JSDoc.
- El JSDoc no narra implementación ni proceso (planes, olas, IDs de tareas) ni repite el nombre.
- Excepciones: `// eslint-disable-next-line <regla> -- <motivo>`, `// @ts-expect-error <motivo>` y código generado (migraciones, `export/`).
- JSDoc en inglés se pasa a español al tocar el archivo. Identificadores en inglés.

## TypeScript

- `strict`. `eslint-disable` solo con motivo.
- `readonly` en propiedades, `ReadonlyArray` en entradas y salidas públicas.
- Estados excluyentes como unión discriminada por enum, no dos opcionales.
- Importaciones relativas con `.js` (`nodenext`), `import type`, módulos nativos con `node:`.
- `async/await`, sin promesas flotantes, `return await` dentro de `try`. Solo se lanza `Error`.

## Reglas de revisión

Ejemplo en `references/ejemplos.md`, sección "Reglas de revisión".

Un hallazgo se demuestra con una corrida o con la línea del diff que rompe la regla.

## Con pstack

Método en `pstack-en-node-template`. De pstack aplican aquí: `typescript-best-practices`, `principle-boundary-discipline`, `architect`, `interrogate`, `blast-radius`, `no-comments`, `principle-prove-it-works`.
