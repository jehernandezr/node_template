---
name: backend-nestjs-composicion
description: Cómo se compone una app NestJS en node_template. Módulos como raíz de composición, tokens de inyección para puertos, casos de uso, comandos, controllers delgados, validación con zod, fachadas, ciclo de vida y apagado ordenado. Úsala al crear módulos, providers, casos de uso, controllers o consumidores, o al cablear un puerto con su adaptador.
---

# Composición con NestJS

NestJS es un detalle de `presentation/` y de la raíz de composición. El dominio y los casos de uso no saben que existe.

## Módulo = raíz de composición

- Un módulo por módulo de negocio, en `presentation/<nombre>.module.ts`. Es el único lugar que une puerto con adaptador.
- `providers` lista casos de uso, adaptadores y servicios. `exports` lista solo la fachada y los tokens que otros módulos pueden usar.
- Los módulos importan módulos, nunca providers sueltos de otro módulo. Nada de `forwardRef`: una dependencia circular es un error de diseño, se resuelve con un evento o moviendo la responsabilidad.
- `@Global()` solo para plataforma (config, logger, reloj). Nunca para negocio.
- Providers con alcance por defecto (singleton). `Scope.REQUEST` está prohibido en negocio: baja el rendimiento y los hooks de ciclo de vida no se ejecutan. El contexto de la petición (tenant, traza) va en `AsyncLocalStorage` de plataforma.

## Tokens para puertos

Las interfaces no existen en runtime. Dos formas, y se elige una por puerto:

```ts
// 1. Clase abstracta: contrato y token a la vez. Preferida para repositorios y servicios.
export abstract class UserRepository {
  abstract findByEmail(email: Email): Promise<User | null>;
  abstract save(user: User): Promise<void>;
}

// 2. Interfaz más token Symbol, cuando varias implementaciones conviven.
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
}
export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');
```

```ts
@Module({
  providers: [
    SignInUseCase,
    { provide: UserRepository, useClass: TypeOrmUserRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: CLOCK, useClass: SystemClock },
  ],
  exports: [UsersFacade],
})
export class UsersModule {}
```

```ts
// Con interfaz y Symbol, el constructor lleva @Inject
constructor(@Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher) {}
```

- Tokens de cadena sueltos están prohibidos. Los `Symbol` se exportan desde un solo archivo, junto al puerto.
- `useFactory` con `inject` cuando el adaptador necesita configuración o un cliente asíncrono. El factory solo arma, no tiene lógica.
- `Clock` e `IdGenerator` del kernel son interfaces: se registran con tokens `CLOCK` e `ID_GENERATOR` de plataforma y se inyectan con `@Inject`. Lo mismo vale para `TransactionManager` y `LoggerPort` si son interfaces.
- `useExisting` para un alias (una clase concreta que cumple dos puertos).
- `@Inject()` y `@Injectable()` solo en `infrastructure/`, `application/` (casos de uso) y `presentation/`. El dominio nunca los lleva.
- Un caso de uso lleva `@Injectable()`; es la única anotación del framework que se tolera en `application/`.

## Casos de uso y comandos

- Una clase por caso de uso, método `execute(command)`, nombre de verbo (`SignInUseCase`). Implementa `UseCase<TInput, TOutput>` del kernel.
- Orquesta: valida permisos, carga agregados, invoca al dominio, guarda, entrega eventos al outbox, devuelve un DTO mínimo (un id o un resultado, no el agregado).
- No contiene reglas de negocio. Si una condición decide el negocio, va en el agregado o en un servicio de dominio.
- Un caso de uso no llama a otro caso de uso. Si dos comparten un paso, es un servicio de aplicación o un evento.
- El comando es una clase de datos inmutable en `application/`, distinta del DTO HTTP. El controller traduce uno al otro.
- Las consultas (lecturas) tienen su propia clase `*Query` y manejador, y no abren transacción de escritura.
- La transacción la abre el caso de uso con `TransactionManager.runInTransaction`. Nunca el controller.

```ts
@Injectable()
export class RegisterUserUseCase implements UseCase<
  RegisterUserCommand,
  RegisterUserResult
> {
  constructor(
    private readonly users: UserRepository,
    @Inject(TRANSACTION_MANAGER)
    private readonly transactions: TransactionManager,
    @Inject(OUTBOX_WRITER) private readonly outbox: OutboxWriter,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: RegisterUserCommand): Promise<RegisterUserResult> {
    const email = Email.create(command.email);
    return this.transactions.runInTransaction(async () => {
      if (await this.users.findByEmail(email)) {
        throw new EmailAlreadyRegisteredError();
      }
      const user = User.register({
        id: this.ids.next(),
        email,
        now: this.clock.now(),
        eventId: this.ids.next(),
      });
      await this.users.save(user);
      await this.outbox.add(user.pullDomainEvents());
      return { userId: user.id.value };
    });
  }
}
```

## Controllers y consumidores

- Delgados: validan la entrada con el esquema zod del contrato, arman el comando, llaman al caso de uso, arman la respuesta. Sin reglas, sin acceso a repositorios, sin `try/catch` de negocio.
- La validación usa un `ZodValidationPipe` de plataforma con el esquema de `@contracts/<servicio>`. No se duplica el esquema con `class-validator`.
- La respuesta se arma explícita con los campos permitidos (lista blanca). Nunca se devuelve una entidad ORM ni un agregado.
- Un controller por tipo de disparador: HTTP, mensaje (`@Subscribe`), job.
- Los errores no se atrapan aquí. Los traduce el filtro global (ver `backend-errores`).
- Autorización por guard y decorador con enum de permisos (ver `backend-seguridad`).

## Fachadas

Un módulo se comunica con otro por su fachada (`UsersFacade`) o por eventos. La fachada expone métodos pequeños con DTO propios, no agregados ni entidades. Si el otro módulo está en otro servicio, es un cliente de la API interna con contrato.

## Ciclo de vida y apagado

- `main.ts` llama `app.enableShutdownHooks()`. El apagado corre en orden inverso al arranque.
- Conexiones, consumidores de cola y jobs se abren en `onModuleInit` o `onApplicationBootstrap` y se cierran en `onModuleDestroy` o `beforeApplicationShutdown`. Los consumidores dejan de tomar mensajes antes de cerrar la base.
- `onApplicationBootstrap` corre cuando todos los módulos ya iniciaron: ahí van validaciones cruzadas (topología de mensajería, migraciones pendientes).
- Los hooks de inicio son asíncronos y fallan fuerte: si la config o la base no están, el proceso no arranca.
- `app.close()` no termina el proceso: sin temporizadores colgados.
- Un módulo no hace trabajo al importarse el archivo. Todo ocurre en hooks.

## Verificación de arranque

```
- [ ] Cada puerto inyectado tiene su provider en el módulo
- [ ] Ningún provider de negocio es global ni de alcance de petición
- [ ] exports solo con fachada y tokens públicos
- [ ] enableShutdownHooks activo
- [ ] La app arranca con NEST_DEBUG=true sin dependencias sin resolver
```
