---
name: backend-codigo-enterprise
description: Reglas transversales de diseño del código del backend de node_template (TypeScript, NestJS). Clases, composición, inyección por constructor, hexagonal, Clean Code, nombres, TypeScript estricto y checklist de revisión. Úsala antes de escribir, revisar o integrar cualquier código en backend/, y como puerta de entrada a las demás skills backend-*.
paths:
  - 'backend/**'
---

# Código enterprise del backend

El backend es software enterprise, no scripting. Todo código nuevo, y todo código que se toque, sigue estas reglas. Las skills `backend-*` profundizan cada tema; esta fija lo común.

## Mapa de skills

| Si vas a...                                         | Carga                                  |
| --------------------------------------------------- | -------------------------------------- |
| Carpetas, alias, compilado, nombres de archivo      | `backend-estructura`                   |
| Agregados, objetos de valor, eventos de dominio     | `backend-dominio`                      |
| Casos de uso, módulos NestJS, tokens, controllers   | `backend-nestjs-composicion`           |
| Errores, códigos, Problem Details                   | `backend-errores`                      |
| Entidades, repositorios, transacciones, migraciones | `backend-persistencia-typeorm`         |
| Outbox, consumidores, idempotencia, colas           | `backend-mensajeria-idempotencia`      |
| Autenticación, autorización, entrada, secretos      | `backend-seguridad`                    |
| Config validada, logs, trazas, health, apagado      | `backend-observabilidad-configuracion` |
| Pruebas de cualquier capa                           | `backend-pruebas`                      |

## Clases, composición e inyección

- Cada pieza con comportamiento es una clase con una sola responsabilidad. Nada de archivos con funciones sueltas que se llaman entre sí.
- Los colaboradores llegan por el constructor como `private readonly`, tipados con el puerto, nunca con la implementación concreta.
- Composición antes que herencia. La herencia se reserva para jerarquías de errores (`DomainError`), `AggregateRoot`, `ValueObject` y bases muy estables (`ShardedRepository`).
- Nada de `new` de dependencias dentro de una clase de negocio. Las instancias se arman en la raíz de composición: el módulo de NestJS de cada servicio (ver `backend-nestjs-composicion`).
- Nada de singletons globales, registros mutables a nivel de módulo ni estado en variables de archivo. Nada de efectos al importar un archivo.
- Funciones sueltas solo para utilidades puras sin dependencias (una conversión de formato) y para la lista declarada de `check-structure.mjs` (fábricas `define*` de contracts, esquemas de `env.ts` y `secret()`, `main()` de las herramientas). Si necesita configuración, reloj, logger o I/O, es una clase.
- El tiempo y los ids se inyectan (`Clock`, `IdGenerator`). Nunca `Date.now()`, `new Date()` ni `randomUUID()` dentro del negocio.

```ts
// Bien
export class SignInUseCase implements UseCase<SignInCommand, SessionAccess> {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionIssuer,
    private readonly clock: Clock,
  ) {}

  async execute(command: SignInCommand): Promise<SessionAccess> {
    /* ... */
  }
}

// Mal: funciones sueltas que leen dependencias de módulo
export async function signIn(email: string, password: string) {
  const user = await db.findUser(email);
}
```

## Arquitectura hexagonal

- `domain/`: entidades, agregados, objetos de valor, eventos, errores de dominio y puertos. Solo depende de `@platform/kernel`. Sin NestJS, TypeORM, AWS, zod ni librerías de infraestructura.
- `application/`: casos de uso (una clase por caso, método `execute`), comandos, consultas, fachadas y DTO internos. Depende de `domain/`.
- `infrastructure/`: adaptadores que implementan los puertos (repositorios TypeORM, clientes HTTP, colas, mappers). Depende de `domain/` y `application/`.
- `presentation/`: controllers, consumidores de mensajes, esquemas de entrada y el módulo de NestJS.
- Un módulo nunca importa el interior de otro: usa su fachada o sus eventos.
- Un puerto lo define el dominio según lo que necesita, no según la API de la herramienta. Pequeño y con un propósito (`UserRepository.findByEmail`, no `findBy(filter: any)`).
- Una librería que hace I/O, tiene aleatoriedad o es de propósito general entra al núcleo solo detrás de un puerto.

## Clean Code

- Nombres que dicen qué es, sin abreviaturas ni sufijos vacíos (`Manager`, `Helper`, `Util`, `Data`). Ver `references/nombres.md`.
- Métodos cortos, un nivel de abstracción por método. Retorno temprano antes que `else` anidado.
- Sin parámetros booleanos que cambian el comportamiento: dos métodos o un enum.
- Más de tres parámetros: un objeto con nombre. Las banderas de comportamiento nunca van en el objeto.
- Enums para eventos, errores, permisos, colas, jobs y estados. Nunca literales de texto sueltos.
- Una constante numérica con significado tiene nombre y un porqué (`MAX_SIGN_IN_ATTEMPTS`), nunca un número mágico.
- Comentarios solo para el porqué. Nada que narre el código ni referencias al proceso (planes, olas, auditorías, IDs de tareas).
- Los comentarios del backend van en español, como las skills. Un archivo con comentarios en inglés se pasa a español cuando se toca. Los identificadores (clases, métodos, enums) siguen en inglés.
- Cada archivo lleva sufijo de rol y contiene una sola clase pública. Nada de `util.ts`, `types.ts`, `limits.ts` ni `model.ts`.
- Las clases de error terminan en `Error` (`InvalidParametersError`, no `InvalidParameters`).
- No se atrapa un error para callarlo. Se atrapa para traducirlo, compensar o reintentar (ver `backend-errores`).

## TypeScript

- `strict` encendido. Sin `any`, sin casts dobles (`as unknown as T`), sin `!` no justificado, sin `eslint-disable` salvo con un porqué escrito.
- Datos que cruzan una frontera (HTTP, cola, base) son `unknown` hasta validarlos con zod. No se asume su forma.
- Estado inmutable: `readonly` en propiedades y `ReadonlyArray` en entradas y salidas públicas.
- Estados que se excluyen se modelan como unión discriminada, no con dos opcionales: `type Contact = { kind: ContactKind.Email; email: Email } | { kind: ContactKind.Phone; phone: Phone }`.
- Las importaciones relativas terminan en `.js` (ESM con `nodenext`). Importaciones de tipo con `import type`. Módulos nativos con `node:`.
- Async: `async/await`, nunca callbacks. Sin promesas flotantes (`@typescript-eslint/no-floating-promises`). Dentro de `try`, `return await`.
- Se lanza solo `Error` (`no-throw-literal`).

## Revisión de un diff

Antes de integrar un cambio, propio o de un agente, repasa:

```
- [ ] Capas respetadas: el dominio no importa infraestructura
- [ ] Dependencias por constructor, tipadas con puertos, sin new de colaboradores
- [ ] Reloj e ids inyectados
- [ ] Enums, no literales, para eventos, errores, colas y permisos
- [ ] Entradas externas validadas con zod en el borde
- [ ] Errores de dominio con código y sin filtrar detalles al cliente
- [ ] Pruebas en __tests__/ junto al código y que verifican comportamiento
- [ ] Migración generada con la CLI y revisada, si cambió una entidad
- [ ] Sin secretos, sin datos personales en logs
```

Si no cumple, se corrige antes del commit.
