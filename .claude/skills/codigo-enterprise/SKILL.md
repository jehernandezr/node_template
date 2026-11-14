---
name: codigo-enterprise
description: Reglas de diseño de código del backend y del front de node_template. Clases, composición e inyección de dependencias, Clean Code y arquitectura hexagonal. Úsala antes de escribir, revisar o integrar cualquier código TypeScript o Dart del repositorio.
---

# Código enterprise

Este repositorio es software enterprise, no scripting. Todo código nuevo, y todo código que se toque, sigue estas reglas.

## Clases, composición e inyección

- Cada pieza con comportamiento es una clase con una sola responsabilidad. Nada de archivos con funciones sueltas que se llaman entre sí.
- Los colaboradores llegan por el constructor como `private readonly`, tipados con el puerto (interfaz o clase abstracta), nunca con la implementación concreta.
- Composición antes que herencia. La herencia se reserva para jerarquías de errores (`DomainError`) y bases muy estables (`BaseRepository`).
- Nada de `new` de dependencias dentro de una clase de negocio. Las instancias se arman en la raíz de composición: el módulo de NestJS de cada servicio o una clase `*Module`/`*Factory` de la librería.
- Nada de singletons globales, registros mutables a nivel de módulo ni estado en variables de archivo.
- Funciones sueltas solo para utilidades puras sin dependencias (por ejemplo, una conversión de formato). Si necesita configuración, reloj, logger o I/O, es una clase.
- El tiempo y los ids se inyectan (`Clock`, `IdGenerator`). Nunca `Date.now()` ni `randomUUID()` dentro del negocio.

```ts
// Bien
export class SignInUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionIssuer,
    private readonly clock: Clock,
  ) {}

  async execute(command: SignInCommand): Promise<SessionAccess> { ... }
}

// Mal: funciones sueltas que leen dependencias de módulo
export async function signIn(email: string, password: string) {
  const user = await db.findUser(email);
  ...
}
```

## Arquitectura hexagonal

- `domain/`: entidades, objetos de valor, eventos y puertos. Solo depende de `@platform/kernel`. Sin NestJS, TypeORM, AWS ni librerías de infraestructura.
- `application/`: casos de uso (una clase por caso, método `execute`), fachadas y DTO internos. Depende de `domain/`.
- `infrastructure/`: adaptadores que implementan los puertos (repositorios TypeORM, clientes HTTP, colas). Depende de `domain/` y `application/`.
- `presentation/`: controllers, consumidores de mensajes y el módulo de NestJS que hace de raíz de composición.
- Un módulo nunca importa el interior de otro: usa su fachada.

## Clean Code

- Nombres que dicen qué es, sin abreviaturas. Métodos cortos, un nivel de abstracción por método.
- Sin parámetros booleanos que cambian el comportamiento: dos métodos o un enum.
- Enums para eventos, errores, permisos, colas, jobs y estados. Nunca literales de texto sueltos.
- Errores de dominio extienden `DomainError` con código `SERVICIO.SUBMÓDULO.ERROR`. No se atrapa un error para callarlo.
- Comentarios solo para el porqué. Nada de comentarios que narran el código, ni referencias al proceso (planes, olas, auditorías, IDs de tareas).
- Sin `any`, sin casts dobles, sin `eslint-disable` salvo con un porqué escrito.

## Front (Dart)

- Las mismas reglas: clases con dependencias por constructor, controladores fuera de los widgets, puertos y adaptadores en `auth`, `api` y los microfrontends.
- Los widgets solo pintan estado. La lógica vive en controladores o flujos probados sin widgets.

## Antes de integrar el trabajo de un agente

Revisa que el diff cumpla esta skill y las skills `estructura-de-proyecto`, `pruebas` y `persistencia-typeorm`. Si no cumple, se corrige antes del commit.
