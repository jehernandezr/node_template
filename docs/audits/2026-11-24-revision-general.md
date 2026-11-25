# Revisión general de node_template

Rama `main` en el commit `249b0f3` (2026-11-24). Cubre todo el proyecto: plataforma, los seis servicios, el front, la infraestructura y CI.

## Cómo se hizo

Once revisores independientes leyeron el código por área, en solo lectura y sin correr pruebas de integración:

1. Shards y enrutamiento de consultas ("query proxy").
2. Traslado de tenants y regiones.
3. Billing, cuotas, medición y reports.
4. Tiempo real, notifications, tasks, flags y búsqueda.
5. Arquitectura transversal y generadores (olas 7 a 9A).
6. Identity: credenciales y sesión.
7. Identity: acceso y ciclo de vida.
8. Mensajería, API interna, sagas, jobs y apagado.
9. Librerías base de la plataforma.
10. Front en Flutter.
11. Infraestructura, CI/CD y herramientas del repositorio.

Cada bloqueante y los hallazgos centrales se comprobaron después contra el código. Las rutas son relativas a la raíz del repositorio. La parte B de la ola 9 (front de F9 y documentación de cierre) no está en `main` y no entra en esta revisión.

Severidades:

- **Bloqueante**: pierde datos o dinero, abre un hueco de seguridad o impide que el sistema funcione desplegado.
- **Importante**: falla real con un escenario concreto, o una violación de arquitectura que se va a copiar.
- **Menor**: deuda con consecuencia acotada.

## Resumen

| Área                                                | Bloqueantes | Importantes | Menores |
| --------------------------------------------------- | ----------- | ----------- | ------- |
| Shards y enrutamiento de consultas                  | 0           | 10          | 5       |
| Traslado de tenants y regiones                      | 3           | 9           | 6       |
| Billing, cuotas, medición y reports                 | 4           | 10          | 10      |
| Tiempo real, notifications, tasks, flags y búsqueda | 1           | 14          | 6       |
| Arquitectura transversal y generadores              | 0           | 14          | 7       |
| Identity: credenciales y sesión                     | 2           | 10          | 9       |
| Identity: acceso y ciclo de vida                    | 3           | 14          | 6       |
| Mensajería, API interna, sagas y jobs               | 3           | 9           | 5       |
| Librerías base                                      | 0           | 11          | 10      |
| Front                                               | 2           | 7           | 11      |
| Infraestructura y CI/CD                             | 4           | 9           | 6       |
| **Total**                                           | **22**      | **~117**    | **~81** |

Los 22 bloqueantes se agrupan en seis temas:

1. **Cobro.** Billing puede cobrar dos veces, cobrar meses de suspensión o no cerrar nunca un periodo. Prod está configurado con el proveedor de pagos falso.
2. **Datos.** Un traslado de tenant puede borrar el original. Otro puede no terminar nunca. Un error pasajero de Postgres lo aborta.
3. **Seguridad de identity.**
   - Se salta el MFA con un id de dispositivo armable.
   - La misma passkey cuenta como dos factores.
   - Una API key puede dar más permisos de los que tiene quien la crea.
   - Un miembro quitado y reinvitado queda bloqueado.
   - Las alertas de seguridad no salen.
4. **Mensajería.** Una caída corta de la base o de SNS manda mensajes válidos a la DLQ o los deja `Dead` sin aviso. La API interna permite que dos handlers ejecuten la misma llave a la vez.
5. **Despliegue.**
   - La imagen no arranca.
   - Los servicios no encuentran a los demás ni reciben sus secretos.
   - Los nombres de target group chocan.
   - Lambda no recibe secretos.
6. **Front.** La app móvil cierra la sesión a los 13 minutos. El backoffice puede actuar sobre la saga equivocada.

---

## 1. Bloqueantes

### Billing

**B1. El cierre de periodos puede no correr nunca.**

- Dónde: `backend/apps/billing/src/modules/invoices/application/close-invoice-periods.job.ts:27` y `backend/apps/reports/src/modules/runs/application/expire-runs.job.ts:21`.
- Problema: los dos jobs diarios usan `JobScheduleKind.Interval` de 24 h. El planificador arma la primera corrida 24 h después del arranque (`backend/libs/platform/scheduling/src/job-schedule-planner.ts:53`).
- Escenario: con despliegues o reinicios cada menos de 24 h, `CloseInvoicePeriods` no corre nunca. No se emiten facturas, las pruebas gratuitas no se activan y no se cobra. Cuando sí corre, lo hace a cualquier hora.
- Arreglo: `JobScheduleKind.Cron` anclado en UTC (por ejemplo `5 0 * * *`).

**B2. Doble cobro por caída entre cobrar y anotar.**

- Dónde: `backend/apps/billing/src/modules/payments/application/charge-invoice.use-case.ts:24` y `collect-invoice.use-case.ts:52`.
- Problema: primero se llama al proveedor y después se anota el intento, en otra escritura. `ChargeRequest` no lleva llave de idempotencia.
- Escenario: el proveedor aprueba 189.000 y el proceso cae antes del INSERT en `payment_attempts`. La siguiente corrida no ve el intento y vuelve a cobrar.
- Arreglo: anotar un intento `Pending` con su id antes de cobrar, en una transacción propia, y pasar ese id al proveedor como llave de idempotencia. Al retomar un `Pending`, consultar el estado en lugar de cobrar.

**B3. Doble cobro entre réplicas.**

- Dónde: `close-invoice-periods.job.ts:32` con `backend/libs/platform/scheduling/src/job-execution.ts:43`.
- Problema: `Deadline.race` suelta el lock a los 15 minutos (`timeoutMs`), pero `run()` ignora la señal y sigue cobrando. Nada reserva cada factura.
- Escenario: 2 réplicas y 1.000 facturas a 1,5 s cada una. A los 15 minutos la réplica B toma el lock, lista las `Issued` y cobra las que A tiene en vuelo.
- Arreglo: respetar `ctx.signal` entre facturas y reservar cada una con `SELECT ... FOR UPDATE SKIP LOCKED` o con un estado `Collecting`.

**B4. Se cobran los meses de suspensión.**

- Dónde: `backend/apps/billing/src/modules/subscriptions/domain/subscription.ts:141-216` y `typeorm-subscription-maintenance.ts:18`.
- Problema: una suscripción suspendida conserva su periodo viejo. `settle()` la reactiva con ese periodo y el job emite una factura por día hasta ponerse al día.
- Escenario: suspendida el 8 de febrero y paga el 15 de mayo. Los días 16, 17 y 18 se cobran febrero, marzo y abril. La prueba de integración ya emite en noviembre una factura de enero.
- Arreglo: al reactivar, empezar el periodo en la fecha de reactivación.

### Mensajería de seguridad

**B5. Las alertas de seguridad y las revocaciones de usuario nunca llegan.**

- Dónde: `backend/apps/identity/src/modules/alerts/infrastructure/outbox-security-alerts.ts:28` y `backend/apps/identity/src/modules/sessions/application/revoke-sessions.use-case.ts:84`.
- Problema: `SecurityAlertRaised` y `TokensRevoked` (alcance de usuario) se publican sin `tenantId`. notifications usa `requireScope`, así que `PlacedTenantVerifier` responde `false` con tenant indefinido y `TenantGate` manda el mensaje a la DLQ.
- Escenario: cambio de contraseña o "cerrar todas las sesiones". La alerta obligatoria no se envía y las conexiones de tiempo real del usuario siguen abiertas. `triggers.consumer.spec.ts:29` llama al caso de uso directo y no lo detecta.
- Arreglo: publicar con el `homeTenantId` del usuario, o aceptar en `TenantGate` suscripciones de alcance de cuenta enrutadas por `UserRef`. Agregar una prueba que pase por el dispatcher.

### Traslado de tenants

**B6. La limpieza de un traslado viejo borra la copia de uno nuevo.**

- Dónde: `backend/apps/identity/src/modules/tenant-moves/application/tenant-move-cleanup.job.ts:69` y `backend/libs/platform/tenant-move/src/application/tenant-moves.ts:156`.
- Problema: el job no excluye tenants con un traslado `Running`. `cleanup` solo comprueba que su barrera siga en el shard y que el directorio no apunte a él.
- Escenario: el traslado 1 va de A a B y su limpieza vence. El traslado 2 vuelve de B a A. Entre `finalize` y `switch`, la limpieza del primero purga A. Después `switch` apunta a A vacío, y el original en B lo borra la limpieza del segundo: pérdida definitiva.
- Arreglo: saltar los tenants con traslado `Running` y no permitir volver a un shard que todavía espera limpieza. Agregar una prueba con la limpieza entre `finalize` y `switch`.

**B7. El traslado no termina con tablas sin `updated_at`.**

- Dónde: `backend/libs/platform/tenant-move/src/transfer/batch/batch-tenant-data-transfer.ts:223-252`.
- Problema: `sync` relee completas, en cada llamada y sin checkpoint, las tablas sin `updated_at` (`login_attempts`, `saga.step_log`, `user_tenants`, `recovery_codes`).
- Escenario: 300 mil filas en `login_attempts` con lotes de 500. El presupuesto de 4 s se agota siempre en esa tabla, las siguientes nunca se copian y la saga termina en `RequiresIntervention`.
- Arreglo: en `sync`, solo copiar filas nuevas de esas tablas y dejar los cambios a la reconciliación por tramos de `verify`. Otra opción es guardar el cursor en `tenant_move_checkpoints`.

**B8. Un error de Postgres pasajero aborta o congela el traslado.**

- Dónde: `backend/libs/platform/internal-api/src/nest/internal-api-contract.providers.ts:20`.
- Problema: el servidor interno usa un `FailureClassifier` sin reglas de Postgres, así que todo `QueryFailedError` es permanente y responde `protocolViolation`.
- Escenario 1: billing confirma una factura con sus líneas entre la copia de `invoices` y la de `invoice_lines`. La FK falla (23503) y la saga compensa todo el traslado.
- Escenario 2: un corte durante `switch`, después del pivote, deja el tenant congelado en `RequiresIntervention`.
- Arreglo: registrar `PostgresFailureClassifier` en el `CallOutcomeFactory` del servidor, y responder `RoundPending` ante 23503.

### Identity

**B9. Se salta el MFA con un id de dispositivo armable.**

- Dónde: `backend/apps/identity/src/modules/devices/application/device-registry.ts:38-58` y `authentication/application/sign-in-with-password.use-case.ts:98`.
- Problema: el dispositivo se reconoce solo por el id público `dv1_<sub>_<htid>_<did>`, sin prueba de que se tiene su clave. Un dispositivo reconocido no pide MFA. El diseño habla de un `deviceId` firmado.
- Escenario: con la contraseña robada y un access token viejo (sus claims los ven todos los servicios y el JS de la web), el atacante arma el id y entra sin segundo factor. Con passkey, además gana `amr: device` y `mfaVerifiedAt`, así que también pasa el step-up.
- Arreglo: exigir en el inicio de sesión una firma ES256 del dispositivo con el esquema de `SignedDeviceRequest`, o un secreto opaco por dispositivo guardado con HMAC.

**B10. La misma passkey cuenta como primer y segundo factor.**

- Dónde: `backend/apps/identity/src/modules/passkeys/application/passkey-authentication.use-case.ts:77-121` y `mfa/application/mfa-method-catalog.ts:45`.
- Problema: cuando una passkey sin verificación de usuario (UV) pide segundo factor, se ofrece Passkey, y `verifyPending` no exige UV ni otra credencial.
- Escenario: una llave FIDO robada sin PIN abre una sesión con MFA marcado.
- Arreglo: no ofrecer Passkey si ya fue el primer factor, y exigir `userVerified` en `mfaVerify` y `stepUpVerify`.

**B11. Una API key puede dar más permisos de los que tiene quien la crea.**

- Dónde: `backend/apps/identity/src/modules/api-keys/application/manage-api-keys.use-case.ts:66-112`.
- Problema: crear o rotar una key solo exige `identity:api-keys:manage`. No se comparan los permisos de la cuenta de servicio con los del actor.
- Escenario: un rol con solo `api-keys:manage` crea una key para una cuenta con `billing:write` e `identity:members:read`, y con ella lee los emails de todos los miembros.
- Arreglo: `GrantablePermissions.assert(actor, account.permissions)` en `issue` y `rotate`.

**B12. Un miembro quitado y reinvitado queda bloqueado.**

- Dónde: `backend/apps/identity/src/modules/access/application/tenant-access-setup.ts:153` y `manage-members.use-case.ts:204`.
- Problema: al quitarlo, `auth:pv:user:{t}:{u}` queda en N+1 sin TTL. Al reinvitarlo, la membresía se crea con `permissionVersion: 1`, y el verificador rechaza todo token con versión menor a la guardada.
- Escenario: el token trae `T.1` contra 4 guardado: `stalePermissions`. El refresh vuelve a firmar `T.1` y el ciclo se repite.
- Arreglo: conservar el último pv con una lápida, o crear la membresía con el guardado más uno.

**B13. Descartar un tenant deja su acceso y rompe "mis tenants".**

- Dónde: `backend/apps/identity/src/modules/tenants/application/change-tenant-status.use-case.ts:86-103`.
- Problema: la compensación `discard` borra solo la fila del tenant y el slug. Quedan la membresía Owner, los roles, los grupos, `tenant_access_versions` y la proyección `user_tenants`.
- Escenario: billing rechaza `OpenAccount`, la saga compensa y desde ahí `GET /v1/me/tenants` responde `TENANT.NOT_FOUND` para ese usuario, para siempre.
- Arreglo: que `discard` borre el acceso y la proyección del tenant, que `ListMyTenants` tolere un tenant ausente, y agregar la aserción a `identity-sagas.int-spec.ts`.

### Mensajería, API interna y sagas

**B14. Una caída corta manda mensajes válidos a la DLQ.**

- Dónde: `backend/libs/platform/messaging/src/dispatch/delivery-classifier.ts:62-79` y `backend/libs/contracts/platform/src/kit/define-messaging.ts:94`.
- Problema: todas las colas usan 5 intentos con FullJitter de base 1 s, una ventana de 7 a 15 s. Las fallas de infraestructura y las reentregas `InProgress` gastan el mismo `receiveCount`.
- Escenario: un failover de RDS Multi-AZ (60 a 120 s) manda a la DLQ todo lo que llegue en ese lapso.
- Arreglo: no contar las fallas de infraestructura contra `maxAttempts`, subir el valor por defecto a unos 10 intentos que lleguen a varios minutos, y dejar `maxReceiveCount` holgado por encima.

**B15. El outbox marca eventos `Dead` en silencio.**

- Dónde: `backend/libs/platform/messaging/src/outbox/outbox-relay.ts:174-195`.
- Problema: una falla de transporte deja el registro `Dead` al décimo intento (4 a 8 minutos). Es terminal, sin métrica, alarma ni reenvío. Con el breaker abierto, el resto del lote gasta intentos sin publicar. Un `Dead` no bloquea a su grupo FIFO.
- Escenario: SNS degradado 10 minutos. Todos los eventos de ese lapso se pierden sin aviso, y los consumidores FIFO reciben `Updated` sin el `Created`.
- Arreglo: reservar `Dead` para lo que nunca se podrá entregar. Ante fallas de transporte, reintentar sin límite con espera tope y sin contar los rechazos del breaker. Publicar el `RelayReport` como métricas con alarma y agregar un comando de reenvío.

**B16. Dos handlers ejecutan la misma llave a la vez.**

- Dónde: `backend/libs/platform/internal-api/src/client/call-attempt.ts:51` y `backend/libs/platform/service/src/nest/runtime/platform-runtime.module.ts:406`.
- Problema: el servidor interno no hace cumplir el plazo (no hay `signal`). El lease del claim es el plazo del intento más 5 s, unos 10 s. Con `CatalogIdempotencyStore`, que usan los cinco servicios, `complete` no se confirma junto con los efectos.
- Escenario: un handler tarda 12 s y el cliente reintenta con la misma llave. El lease venció, hay takeover y un segundo handler corre en paralelo. Los dos confirman efectos y eventos.
- Arreglo: pasar al handler un `AbortSignal` derivado de `meta.deadline`, calcular el lease con el plazo de la llamada completa y permitir el takeover solo si el handler anterior terminó.

### Infraestructura

**B17. La imagen de los servicios no arranca.**

- Dónde: `backend/infra/scripts/service.Dockerfile:8,13` y `backend/tools/app-bundler/src/app-bundler.ts:39,43`.
- Problema:
  - El bundler escribe `main.mjs`, `worker.mjs` y `lambda.mjs`, pero la imagen corre `node main.js`.
  - El bundler deja las dependencias externas (`packages: 'external'`) y la imagen no instala ninguna. El zip de Lambda tampoco lleva `node_modules`.
  - Los workers no tienen `command`, así que corren la API.
  - La arquitectura es ARM64, pero el build no pasa `--platform`.
- Escenario: el primer deploy falla con "Cannot find module /app/main.js". Si se corrige el nombre, falla con `ERR_MODULE_NOT_FOUND '@nestjs/core'`.
- Arreglo: una etapa con `pnpm deploy --prod`, `CMD ["node","main.mjs"]`, un `command` por defecto para los workers, `buildx --platform linux/arm64` y una prueba de humo que arranque la imagen.

**B18. Nombres de target group que chocan.**

- Dónde: `backend/infra/terraform/modules/service-fargate/main.tf:319`.
- Problema: `substr(local.full_name, 0, 32)` le da el mismo nombre a la API y al tiempo real de notifications. En dev, además, el nombre termina en guion y AWS lo rechaza.
- Escenario: el apply de notifications falla en todos los ambientes. Las pruebas usan un prefijo corto y no lo ven.
- Arreglo: `name_prefix` con `create_before_destroy`, o un nombre truncado con un hash, y un caso de prueba con el prefijo real.

**B19. Los servicios no encuentran a los demás ni reciben sus secretos.**

- Dónde: `backend/infra/terraform/stacks/service/main.tf:33-60`, `backend/infra/terraform/modules/service-fargate/main.tf:307` y los `terraform.tfvars` de cada servicio.
- Problema:
  - `INTERNAL_API_BASE_URLS` es obligatoria y nada la produce.
  - No hay Service Connect ni Cloud Map.
  - El security group solo permite salida a 443.
  - Ningún stack crea `INTERNAL_API_SHARED_SECRET`, los peppers ni las llaves de firma: todos los tfvars traen `secrets = {}`.
  - `WEB_ORIGINS` no está en ningún tfvars.
- Escenario: billing no arranca ("INTERNAL_API_BASE_URLS no tiene la URL de identity"). Si arrancara, la web recibiría `originRejected` en cada llamada.
- Arreglo: Service Connect por ambiente con alias `<svc>.internal` y regla de entrada al puerto del contenedor. Las URLs se arman en el stack. Los secretos se crean con `random_password` efímero y `secret_string_wo`, y `web_origins` se agrega al stack.

**B20. Con runtime Lambda el servicio no recibe sus secretos.**

- Dónde: `backend/infra/terraform/modules/service-lambda/main.tf:30-34` y `backend/libs/platform/service/src/nest/lambda/lambda-bootstrap.ts`.
- Problema: a la Lambda solo le llegan los ARN, para el permiso IAM, y `LambdaBootstrap` no lee Secrets Manager.
- Escenario: identity en Lambda falla la validación de config en cada arranque en frío.
- Arreglo: pasar un `SECRETS_MAP` en el entorno y resolverlo antes de cargar la config, con un puerto en `adapters/aws`.

### Front

**B21. La app móvil se desloguea a los 13 minutos.**

- Dónde: `front/packages/auth/lib/src/api_auth_repository.dart:31-52` e `identity_connection.dart:61-69`.
- Problema: el móvil nunca declara su canal: no manda `X-Session-Transport: bearer` ni `Authorization: Bearer <session token>`. `ClientChannelResolver` lo trata como web y manda el session token en una cookie que `IOClient` descarta.
- Escenario: el login funciona, pero el primer refresh (a los ~13 minutos) responde `UNAUTHENTICATED` y la sesión se cierra. `logout()` no revoca nada en el servidor.
- Arreglo: una estrategia de transporte de sesión en `ApiAuthRepository` (web o nativo) con headers por petición, y un transporte falso en pruebas que aplique la regla del backend.

**B22. El backoffice puede actuar sobre la saga equivocada.**

- Dónde: `front/microfrontends/backoffice/lib/src/screens/saga_detail_screen.dart:36`, `tenant_detail_screen.dart:30` y `front/microfrontends/billing/lib/src/screens/invoice_detail_screen.dart:33`.
- Problema: go_router reutiliza la página cuando cambia solo el parámetro y `ControllerBuilder` no recrea el controlador. tasks, dlq y assistant lo esquivan con una `ValueKey` puesta a mano; estas tres pantallas no la tienen.
- Escenario: comprobado con una prueba de sondeo. La URL dice `s-102` y la pantalla muestra `s-101`, así que el operador compensa la saga equivocada.
- Arreglo: llave por `state.uri` en `_PageWrapper` (`front/packages/shell_core/lib/src/shell_router.dart:211`), o `inputs` en `ControllerBuilder`. Agregar una prueba de navegación de un id a otro.

---

## 2. Importantes

### 2.1 Shards y enrutamiento de consultas ("query proxy")

El enrutamiento tiene buenas bases: carga única por tenant, lápidas por versión y compare-and-set en Lua. Los problemas aparecen en los bordes: transacciones anidadas, réplicas atrasadas, cambio de instancia y falta de Valkey.

- `backend/libs/platform/persistence/src/typeorm-transaction-manager.ts:48-58`: `runInTransaction` resuelve en modo escritura antes de mirar si ya hay una transacción abierta. Cada escritura anidada vuelve a pasar por la compuerta. Si el traslado cierra la compuerta, una transacción que ya entró espera de 5 a 60 s con el candado tomado y termina en `TENANT_MIGRATING`: el protocolo mata las transacciones que debía dejar terminar. **Arreglo:** si ya hay transacción, resolver en lectura y solo tocar la guarda.
- `backend/libs/platform/sharding/src/router/placement-loader.ts:88-95`: el router lee el directorio de la réplica, porque el runtime no pasa `directoryReadPrimary`. Detecta con `isOutdated` que la versión es vieja y aun así la entrega. Tras un `switch`, las lecturas van al origen congelado, y un tenant suspendido sigue aceptando escrituras mientras dura el atraso. **Arreglo:** releer del primario con `DirectoryWriter.readPlacement`.
- `backend/libs/platform/persistence/src/shard-data-sources.ts:43-69`: el cambio de instancia de un shard tiene una carrera. Queda un pool inicializado fuera del mapa que nadie cierra, y tras un failover los pools se destruyen y recrean una y otra vez. **Arreglo:** registrar la promesa antes del primer `await` y no dejar que una instancia vieja reemplace a una nueva.
- `backend/libs/platform/sharding/src/write-gate/placement-transition.ts:50`: si el placement ya está como se pide, la transición vuelve sin invalidar ni publicar. Si el proceso cayó entre escribir e invalidar, quedan unos 5 minutos de placement viejo. **Arreglo:** invalidar siempre, porque es idempotente.
- `backend/libs/platform/service/src/nest/runtime/runtime-adapter-selector.ts:21-28`: sin `VALKEY_HOST` arranca con `NullRoutingCache` e `InProcessDirectoryChannel`, en silencio. Las demás réplicas no se enteran de una suspensión o un traslado durante 60 s. **Arreglo:** fallar el arranque fuera de desarrollo.
- `typeorm-transaction-manager.ts:190-199`: el tenant sale de dos fuentes. El shard y la barrera usan el `ShardScope`, pero `app.tenant_id` sale del contexto de la petición, y el trigger de auditoría prefiere la sesión. Una saga de B que corre durante una petición de A queda en el `audit_log` como de A. **Arreglo:** usar `handle.resolved.tenantId` y que el trigger prefiera la columna de la fila.
- `typeorm-transaction-manager.ts:54` y `backend/libs/platform/sharding/src/transaction-shard-guard.ts:36`: la guarda es por shard, pero la barrera es por tenant. Un `ShardScope` de otro tenant en el mismo shard se une a la transacción sin pasar la barrera y reescribe `app.tenant_id`. Hoy ningún llamador anida así, pero la API lo permite. **Arreglo:** guardar el par (shard, tenant) y lanzar error si cambia.
- `backend/libs/platform/adapters/postgres/src/database/platform-entity-managers.ts:48` y `typeorm-saga-store.ts:282`: las purgas de `idempotency_keys` y de sagas no pasan por `TenantMaintenanceSession` ni por la barrera. Hacen fallar el `verify` del traslado o dejan instancias sin bitácora. **Arreglo:** correrlas en la sesión de mantenimiento con `unfenced('tenant_id')`.
- `backend/libs/platform/persistence/src/across-shards.ts:106`: `sources.get` queda fuera del `Deadline` y no hay `connectTimeoutMS`. Una instancia que no responde frena cada pasada unos 2 minutos, y `fn` sigue corriendo después de vencer el plazo.
- `backend/libs/platform/persistence/src/tenant-write-fence.ts:37-61`: la barrera usa candados de sesión tomados fuera de la transacción, y el ADR 0024 pone la base detrás de RDS Proxy. Con un proxy que multiplexa por transacción, el candado y el unlock caen en backends distintos, y `leave` ignora el booleano de `pg_advisory_unlock_shared`. **Arreglo:** decidirlo en el ADR: candado de transacción, o conexiones de escritura que no pasen por el proxy.

### 2.2 Traslado de tenants y regiones

- `backend/libs/platform/tenant-move/src/transfer/batch/tenant-row-filter.ts:49`: `tenant_id::text = $1` impide usar los índices, así que cada consulta recorre la tabla de todos los tenants. **Arreglo:** comparar contra el tipo real de la columna.
- `backend/apps/identity/src/modules/tenant-moves/application/start-tenant-move.use-case.ts:74` y `backend/libs/platform/saga/src/model/saga-instance.ts:288`: cada `RoundPending` cuenta como suspensión, con un tope de 20, y la saga no tiene plazo. Si se agota antes del pivote, identity y tasks quedan congelados y nadie puede iniciar sesión. **Arreglo:** que una ronda pendiente no cuente como fallo, y un plazo que compense antes del pivote.
- `tenant-moves.ts:105-112`: `abort` purga el destino antes de bajar la barrera y abrir la compuerta, así que el tenant queda congelado toda la compensación. **Arreglo:** abrir primero.
- `tenant-move-shards.ts:29-45`: el origen se toma del caché en proceso, no del directorio, y se puede verificar contra una copia vieja.
- `tenant-moves.ts:81-90`, `tenant-write-fence.ts:100` y `logical-replication-transfer.ts:105`: el presupuesto de tiempo se reparte mal. Empieza después de `raise`, que espera sin `lock_timeout`. Con la estrategia lógica, una llamada gasta tres presupuestos (unos 12 s contra 6). **Arreglo:** un solo `TransferBudget` por llamada.
- `logical-replication-transfer.ts:182-195`: `copy_data = true` sobre un destino con filas viejas del tenant choca por llave, y la copia inicial nunca termina.
- `backend/libs/platform/sharding/src/shard-router.ts:62-73`: con el caché viejo, la región B responde 421 y devuelve el cliente a A. El rebote dura hasta 5 minutos. **Arreglo:** recargar del directorio antes de responder `WrongRegion`.
- `placement-transition.ts:64`: el choque con un shard dedicado (`ShardTaken`) aparece en `switch`, después del pivote. **Arreglo:** validarlo en `sync`.
- `backend/infra/terraform/stacks/service/main.tf:42` y `remote_state.tf:47`: Terraform arma un catálogo por región con nombres de variables de base de datos distintos a los del código, y no pasa `REGIONS`, `SERVICE_REGION` ni `TENANT_MOVE_*`. El traslado entre regiones no puede funcionar desplegado.

### 2.3 Billing, cuotas, medición y reports

- `backend/apps/billing/src/modules/invoices/application/settle-invoice.use-case.ts:53`: dos webhooks `mark-paid` concurrentes producen write skew. El tenant queda suspendido con todo pagado. **Arreglo:** `FOR UPDATE` sobre la suscripción.
- `invoices/domain/invoice.ts:85` y `collect-invoice.use-case.ts:29`: una factura `Declined` nunca se reintenta y `failedAttempts` no pasa de 1. **Arreglo:** reintentos con calendario.
- `plans/infrastructure/persistence/typeorm-plan-catalog.ts:45-74`: los planes se reescriben en el mismo id. La factura toma el precio nuevo y los ajustes el viejo, y puede quedar negativa y marcada pagada sin cobro. **Arreglo:** filas de plan inmutables y versionadas.
- `backend/libs/platform/quotas/src/billing-quota-checker.ts:52`: descarta el `allowed=false` de una suscripción suspendida, así que el tenant suspendido sigue usando la API.
- `usage-flush.job.ts:40` y `billing-quota-checker.ts:67`: la cuota de llamadas llega con 3 a 4 minutos de atraso (el diseño dice 10 s), y el chequeo y el consumo no son atómicos. **Arreglo:** `INCRBY` atómico en Valkey por tenant, métrica y periodo.
- `usage/application/track-membership.use-case.ts:19`: la cola no es FIFO, se ignora `changedAt` y la salida borra sin lápida, así que un usuario puede quedar contado para siempre.
- `entitlements/application/entitlement-queries.ts:77`: entre el fin del periodo y el cierre, el uso se mide sobre el periodo que ya terminó.
- `invoices/presentation/invoices.internal-operations.ts:42`: `mark-paid` y `mark-failed` descartan `reference` y `reason`, y no validan el monto pagado.
- No hay cancelación de suscripción, y si el único dueño borra su cuenta, el tenant se sigue cobrando.
- Pruebas: billing no tiene pruebas unitarias de su capa de aplicación (ver la sección 4).

### 2.4 Tiempo real, notifications, tasks, flags y búsqueda

- `backend/libs/platform/realtime/src/auth/auth-state-stream-revocations.ts:20`: el latido solo mira la época del tenant. La revocación de una sesión o un usuario depende de una trama asíncrona, y la conexión vive hasta que vence la sesión (días). **Arreglo:** consultar en cada latido la sesión revocada y la época del usuario.
- `backend/libs/platform/adapters/valkey/src/realtime/valkey-realtime-stream.ts:122`: el listener se registra antes del SUBSCRIBE. Si este falla, el canal no vuelve a suscribirse y hay fuga de memoria.
- `valkey-realtime-stream.ts:103` y `realtime-session.ts:40`: reanudar desde un id anterior a la primera trama retenida deja un hueco silencioso. **Arreglo:** una trama `resync`.
- `realtime-session.ts:102`: la trama de cierre `*` se reproduce a conexiones nuevas al reanudar, y puede sacar al usuario de una sesión válida. **Arreglo:** incluir `revokedBefore` en la trama.
- `sse-response-sink.ts:23` y `socket-sink.ts:18`: no hay contrapresión (se ignora el retorno de `write()`) ni tope de conexiones por usuario.
- `backend/apps/realtime/src/realtime-app.ts:10`: no usa `HttpApplicationSetup`, así que no tiene CORS ni helmet, y vive en otro hostname. El navegador bloquea SSE.
- `backend/libs/platform/realtime/src/realtime-components.ts:28`: `REALTIME_AUTH=cookie` lee la cookie `rt_access`, que ningún servicio emite, así que responde 401 a todo.
- `sse-transport.ts:64`: un corte de Valkey responde 401 en vez de 503, y el front cierra la sesión.
- `backend/apps/notifications/src/modules/email/application/send-email.use-case.ts:57`:
  - Problema: un envío exitoso queda `Failed` si falla el registro, y nada reserva el `messageId`.
  - Escenario: el usuario recibe dos códigos.
  - Arreglo: `INSERT ... ON CONFLICT DO NOTHING` en estado `sending` antes de enviar.
- `email-template.ts:31`: si falta un parámetro, la plantilla omite la línea en silencio. Sale un correo de MFA sin código, marcado `Sent`.
- `backend/libs/platform/search/src/postgres/postgres-hybrid-search.ts:47`: el índice HNSW es global por shard y el filtro por tenant va después, así que un tenant pequeño no obtiene vecinos. Además tasks no arranca con `SEARCH_MODE=hybrid` y no hay reindexado al cambiar de modo.
- `backend/apps/tasks/src/modules/tasks/infrastructure/persistence/typeorm-task-maintenance.ts:62`: `requireEveryShard` ignora los shards caídos o con timeout, y un borrado de datos personales incompleto se reporta como hecho.
- `backend/apps/identity/src/modules/access/application/access-resolver.ts:65`: los flags reciben como `groups` nombres de rol en texto libre, y como `plan` el `tenant.kind`, así que las reglas por plan nunca coinciden.

### 2.5 Identity: credenciales y sesión

- `mfa/application/challenge-verifier.ts:53`: no hay contador de fallos de MFA por usuario y el step-up va en el escalón Standard (600/min). Con una sesión robada salen unas 470 pruebas de TOTP por minuto, con probabilidad del 50 % en unas 8 h.
- `sessions/application/refresh-session.use-case.ts:57-68`: la rotación se confirma antes de validar el usuario y el tenant y de firmar. Si algo falla después, el cliente pierde la generación nueva y el reintento se revoca como robo. **Arreglo:** validar y firmar antes de rotar, y en la ventana de gracia devolver el token vigente.
- `sessions/application/session-revoker.ts:64`: `auth:revoked:{sid}` se escribe en `afterCommit` sin reintento. Un parpadeo de Valkey deja vivo hasta 15 minutos el access token del ladrón.
- `passwords/application/confirm-password-reset.use-case.ts:41`: la revocación de sesiones va en otra transacción. Un reset puede quedar confirmado sin revocar, con el token ya consumido.
- `passwords/application/request-password-reset.use-case.ts:17`: la llamada síncrona a notifications solo ocurre con un email existente, lo que permite enumerar cuentas por tiempo o por errores. **Arreglo:** encolar y responder 202.
- `authentication/application/sign-in-with-password.use-case.ts:78`: el INSERT en `login_attempts` solo ocurre con un usuario existente, otra forma de enumerar por tiempo (confianza media).
- `mfa/application/mfa-recovery.use-case.ts:107`: una recuperación pendiente no vence ni se cancela, y se ignora el resultado de `consume`.
- Hay ciclos `authentication↔devices`, `mfa↔devices` y `mfa↔passkeys`, que se rompen con `@Global`.
- Faltan specs de `SignInWithPassword`, `RefreshSession`, `ChallengeVerifier`, `VerifyMfa`, `StepUp`, `PasskeyAuthentication`, `SimpleWebAuthnVerifier`, `IssueAccessToken` y `ConfirmPasswordReset`. El autenticador de prueba siempre marca UV.

### 2.6 Identity: acceso y ciclo de vida

- `invitations/application/accept-invitation.use-case.ts:84`: el techo de permisos solo se revisa al invitar. La invitación de un admin ya removido sigue valiendo 7 días.
- `accept-invitation.use-case.ts:118`: el cupo de usuarios se revisa sin reserva. Tres aceptaciones simultáneas dejan 7 usuarios en un plan de 5.
- `access/application/manage-members.use-case.ts:90`: `removeErased` se salta la regla del último dueño. Si el único owner borra su cuenta, el tenant queda sin cabeza.
- `users/application/erase-user.use-case.ts:49`: el borrado de cuenta deja datos personales en `audit_log` (email y nombre), `invitations.email`, `sessions.ip` y `user_agent`, `login_attempts.ip`, el secreto TOTP y las recuperaciones. Una solicitud de habeas data termina "con éxito" con el email todavía guardado.
- `users/application/confirm-email-change.use-case.ts:51`: el índice del catálogo y la fila del usuario se escriben en transacciones distintas, sin compensación. `moveEmail` no mira `affected`.
- `confirm-email-change.use-case.ts:75`: la alerta `EmailChanged` va a la dirección nueva, no a la anterior.
- `docs/identity/matriz-de-acceso.md:70-86`: crear una API key exige MFA reciente; invitar, cambiar grupos o roles y editar cuentas de servicio no.
- `access/application/access-version-publisher.ts:30`: la versión de permisos se escribe en `afterCommit` sin reintento y con un SET no monótono.
- `backend/libs/platform/http/src/endpoint-options.ts:12`: invitar, cambiar email y crear tenants van en el escalón Standard (600/min). La plataforma puede servir de relé de phishing.
- `manage-members.use-case.ts:42`: `list` no pagina y lanza un `Promise.all` por miembro, alcanzable también con API key.
- Los 15 módulos de negocio de identity son `@Global()`, contra la skill backend-nestjs-composicion. Eso esconde ciclos que se resuelven con `ModuleRef`.
- La autorización está repartida:
  - Access calcula `granted` en el controlador.
  - `GrantablePermissions` duplica `ActorPermissions`.
  - Los `Manage*` tienen varios métodos.
- El dominio de access es anémico: los invariantes viven en la aplicación, y en todo el repositorio hay cero usos de `addDomainEvent` y `pullDomainEvents`.

### 2.7 Mensajería, API interna, sagas, jobs y apagado

- `backend/libs/platform/saga/src/engine/step-executor.ts:249`: un paso `Uncertain` con el plazo vencido se compensa de inmediato, y la compensación puede llegar antes que el efecto. El recurso queda reservado para siempre. **Arreglo:** una lápida por llave de saga y paso.
- `saga-instance.ts:282-310`: las 20 suspensiones se agotan en 10 a 25 minutos. Antes del pivote, el agotamiento va a `RequiresIntervention` sin compensar. Ese estado es terminal, sin API para reanudar ni alarma.
- `saga-engine.ts:114`: la saga arrancada dentro de una transacción corre en `afterCommit` y se espera antes de devolver. La petición HTTP espera la saga entera.
- `backend/libs/platform/persistence/src/nest/persistence-shutdown.hook.ts:16`: Nest 12 cierra los `DataSource` en `onModuleDestroy`, antes de cerrar el servidor HTTP. En un SIGTERM, las peticiones en vuelo y las que entran durante el cierre fallan.
- `backend/libs/platform/scheduling/src/job-runner.ts:160`: tras `timeoutMs` se limpia `running` y arranca otra pasada solapada. `stop` no espera al job real, y el relay y la recuperación ignoran `signal`.
- `backend/libs/platform/adapters/postgres/src/saga/typeorm-saga-store.ts:194`: la recuperación ordena por `updatedAt`, que el lease no toca. Cincuenta sagas venenosas bloquean la recuperación de todas las demás.
- `backend/libs/platform/messaging/src/nest/messaging.providers.ts:85`: en un servicio sin `requireScope`, el claim, el handler y `complete` corren sin transacción, contra lo que dice la skill.
- `backend/libs/platform/internal-api/src/nest/internal-api-server.providers.ts:143`: no hay verificador de SigV4 en el servidor, así que `INTERNAL_API_SIGNER=sigv4` deja todo en 401. La alternativa existe solo de un lado.
- `backend/libs/platform/adapters/aws/src/sqs-delivery-processor.ts:53`: el lote de 10 se procesa en serie con visibilidad de 30 s, sin extenderla. Los últimos mensajes vencen y suben `receiveCount`.

### 2.8 Librerías base

- `backend/libs/platform/config/src/sections/service.config.ts:11`:
  - Problema: `NODE_ENV` vale `development` por defecto y el módulo de Lambda no lo define. Las protecciones de producción dependen de él, por ejemplo el rechazo de `IDENTITY_MAILER=console`.
  - Arreglo: decidir por `DEPLOY_ENVIRONMENT`.
- `backend/libs/platform/http/src/nest/endpoint-context.interceptor.ts:72`:
  - Problema: el `timeout` de rxjs no cancela el handler y responde 504 marcado como reintentable.
  - Escenario: un POST lento se duplica.
- `backend/libs/platform/adapters/valkey/src/valkey-bloom-filter.ts:73`: los `add()` que llegan durante una reconstrucción se pierden con el RENAME, y aparecen falsos negativos.
- `backend/libs/platform/primitives/src/failure/failure-classifier.ts:38`:
  - Problema: `ECONNRESET`, `ETIMEDOUT`, 502 y 504 se clasifican como "sin efectos", pero ocurren después del envío.
  - Escenario: una saga no compensa algo que sí se aplicó.
- `backend/libs/platform/observability/src/redaction/redaction-rules.ts:17`: el redactor no atrapa:
  - plurales como `tokens` o `passwords`;
  - `key` sola;
  - un query param al inicio del texto;
  - el `detail` de pg con el email.
- `observability/src/telemetry/instrumentation-factory.ts:15`: los spans HTTP llevan la query sin redactar, `token=` incluido.
- `backend/libs/platform/cache/src/single-flight.ts:53`: una carga colgada del líder deja la llave colgada para siempre.
- `cache/src/versioned-keyspace.ts:94`: la llave de caché no lleva el tenant de forma obligatoria. Hoy ningún servicio la usa, pero la trampa está puesta.
- `resilience/src/execution/consecutive-circuit-breaker.ts:41`: la prueba en HalfOpen no tiene plazo y el circuito puede quedar abierto indefinidamente. Las fallas tardías lo reabren.
- `http/src/rate-limit-gate.ts:34`: el límite de auth es por IP exacta, y en IPv6 se evade rotando dentro del /64.
- `rate-limit/src/nest/rate-limit.providers.ts:73`: el limitador de Valkey no tiene breaker. Con Valkey caído, el p99 sube un segundo.

### 2.9 Arquitectura transversal y generadores

- `backend/apps/{tasks,reports,billing}/src/shared/utils/tenant-shard.ts`: las tres copias son idénticas (mismo md5), y hay variantes en notifications e identity. Es la pieza que fija `app.tenant_id` para el RLS, y es un `@Injectable` dentro de `utils/`. **Arreglo:** una clase `ShardScopes` en `@platform/persistence`.
- Hay dos bases de repositorio paralelas:
  - `ShardedRepository`, `CatalogRepository`, `Criteria` y `PageBuilder` no tienen consumidores fuera de su librería.
  - Los 17 repositorios reales usan `TenantIsolatedRepository` con cursores hechos a mano.
  - El ADR 0024 nombra la primera.
  - **Arreglo:** elegir una de las dos.
- Hay duplicación entre servicios:
  - Cuatro variantes de "quién actúa".
  - Tres formas de cursor, todas con `new CursorCodec()` dentro de la clase.
  - Cinco `*-test-app.ts` casi iguales, 647 líneas en total.
  - `migrate.ts` repetido cinco veces.
  - El checker de cuotas trae un caché propio cuando ya existe `CacheAside`.
- `backend/apps/notifications/src/modules/email/presentation/email-sender.provider.ts:24`: la elección de adaptador vive en un `switch` dentro de `useFactory`, y arma SES a mano saltándose `AwsModule`. Lo mismo pasa en reports y billing. La plataforma ya resuelve esto con clases selectoras probadas.
- Ocho archivos de `application/` inyectan `AppConfig` y llaman `root<X>()`, un cast sin verificar.
- Los casos de uso nuevos no implementan `UseCase`:
  - `ManageInbox` es fachada y seis operaciones a la vez.
  - En billing van primitivos y fechas como texto.
  - `SettleInvoice` expone dos métodos.
- `privacy.internal-operations.ts`: el handler orquesta un repositorio ajeno, y dispatch exporta sus repositorios.
- El puerto `TenantDataTransfer` y la capa `application/` de tenant-move dependen de `DataSource` de TypeORM.
- Generadores:
  - `generators:verify` no corre en CI y no compara `app.module`. La plantilla ya no trae `MeteringModule` ni genera el ensayo de traslado.
  - Olvidar la línea en `TenantMoveParticipants.ALL` hace que `MoveTenant` no traslade el servicio nuevo, y ninguna prueba lo detecta.
- OpenAPI (`backend/tools/contracts-export/src/open-api-builder.ts:80`):
  - Los parámetros de query ignoran el esquema zod: se pierden el enum, los límites y `required`.
  - El `PATCH` de tareas exige `taskId` también en el cuerpo.

### 2.10 Front

- `front/packages/auth/lib/src/session_manager.dart:185`: en web, `clear()` no borra la cookie httpOnly. Si el `sign-out` falla, el siguiente usuario del equipo entra a la cuenta anterior.
- `front/packages/auth/lib/src/flows/mfa_flows.dart:118`: la sesión queda abierta si falla `reloadAccess` tras el login, y `_inFlight` se reutiliza entre generaciones.
- `front/microfrontends/account/lib/src/screens/step_up_gate.dart:45`: el step-up se decide con el reloj local, y nadie maneja `IDENTITY.MFA.STEP_UP_REQUIRED` cuando lo responde el servidor.
- `session_manager.dart:162`: el vencimiento se compara con el reloj del dispositivo. Un reloj adelantado refresca en cada llamada.
- `front/apps/mobile/android/app/src/main/AndroidManifest.xml:2`: no tiene `allowBackup="false"` ni el permiso `INTERNET` en el manifiesto principal, así que el release no tiene red.
- `front/packages/api/lib/src/package_http_transport.dart:43`: el timeout no cancela la petición, y ningún contrato tiene `Idempotency-Key`. Un POST lento se duplica.
- Las pruebas de auth usan transportes falsos que ignoran los headers, y ninguna navega de un id a otro. Por eso los dos bloqueantes del front pasan en verde.

### 2.11 Infraestructura y CI/CD

- `backend/infra/terraform/modules/oidc-github/main.tf:14`: los tres roles confían en `repo:X:environment:Y` sin condición de rama ni de workflow. Cualquier rama con `environment: dev` asume el rol de despliegue, que puede ampliar su propia confianza. **Arreglo:** `job_workflow_ref` y un permission boundary.
- `.github/workflows/deploy.yml:95`: plan y apply corren en el mismo job, así que la aprobación de prod ocurre antes de que exista el plan. El deploy por push tampoco espera a CI.
- `backend/infra/terraform/modules/rds-postgres/main.tf:562`: la rotación cambia la contraseña, pero Fargate inyecta `DB_CREDENTIALS` solo al iniciar. El día 30 fallan las conexiones nuevas. **Arreglo:** autenticación IAM en el proxy.
- `backend/infra/terraform/stacks/platform/compute.tf:105`: el ALB de tiempo real es público, sin CloudFront ni WAF, y con `TRUST_PROXY_HOPS=2`, así que la IP del cliente se puede falsificar.
- `backend/infra/scripts/publish-web.sh:29`: `main.dart.js` y los `.part.js` se publican como `immutable` por un año sin hash en el nombre. `--delete` borra los chunks y se publican los `.map`.
- `.github/workflows/mobile-release.yml:5`: los secretos del keystore son de repositorio, sin environment, y el workflow acepta dispatch desde cualquier rama: la llave de firma se puede exfiltrar. Si faltan los secretos, firma con la llave de debug. `publish-mobile` sube un `.aab` con firma de debug.
- Los tfvars se contradicen: `fargate_api_enabled = false` con servicios en runtime `fargate`, y tiempo real sin certificado. Las preconditions fallan en todos los ambientes, y `tf-validate` no planea los tfvars reales.
- `backend/infra/terraform/environments/prod/services/billing/terraform.tfvars:38`: prod usa `BILLING_PAYMENT_PROVIDER = "fake"` con resultado aprobado. Cada factura queda pagada sin cobro.
- `check-structure.mjs` no corre en CI, aunque el hook `.claude/hooks/verify-on-stop.mjs` dice que CI lo vuelve a atrapar.
- El filtro `terraform` de `.github/workflows/ci.yml:53` no incluye `.github/workflows/**` ni `.nvmrc`.

---

## 3. Menores

**Shards y persistencia**

- `catalog-data-source.ts:22`: `close()` no marca el apagado.
- `valkey-write-gate.ts:23`: no normaliza el `tenantId`.
- Las lecturas fuera de transacción no son `READ ONLY` (`UserShardRepository.read`).
- La regla de `shardGroup` solo vive en un comentario (`shard-router.ts:32`).
- Una transacción de escritura cuesta unos 9 viajes a la base.

**Traslado**

- La suma de verificación depende de `TimeZone` y de la intercalación.
- `TENANT_MOVE_GRACE_DAYS = 0` baja la barrera.
- El destino se recalcula en cada llamada.
- `login_attempts` cae en la partición `default` del destino y nunca vence.
- La contraseña del origen va en el texto de `CREATE SUBSCRIPTION` y puede terminar en el log.

**Billing y reports**

- El flush de uso crece de forma cuadrática con un tenant atascado.
- `usage_records` no tiene retención.
- COP se muestra con 2 decimales (49.900 sale como 499,00) y el orden mezcla monedas.
- Un run que falla siempre queda en `Running`.
- Se marca `Expired` antes de borrar el resultado.
- La proyección de tareas en desorden pierde `doneAt`.
- La lista de estados abiertos está copiada en tres sitios.
- `billing-accounts.ts:30` no usa transacción.
- "Hoy" se calcula en UTC.

**Tiempo real y servicios**

- `open()` no revisa `closed` después de `subscribe`.
- El conteo de no leídas se publica fuera de orden.
- La bandeja busca por `id` sin `userId`.
- `VERSION_MISMATCH` no está declarado en las rutas de tasks.
- La columna de búsqueda está fija en español.
- El reparto por porcentaje de los flags es solo por usuario.

**Identity**

- El bloqueo de login es check-then-act: 20 intentos en lugar de 5.
- El login con passkey no rechaza `Deleted`.
- `CaptchaVerifier` y `UnlockAccount` están registrados sin uso.
- La época de revocación no es atómica y compara segundos con `<`.
- `2 ** recent` no tiene tope: da `Invalid Date` y bloquea la recuperación 90 días.
- El catálogo de passkeys no tiene compensación.
- El step-up con passkey no comprueba la sesión.
- La cola de aprobaciones de dispositivo no es atómica.
- Rotar una key ya rotada extiende su validez.
- `rotate` no es atómico.
- `disable` no publica `ApiKeyRevoked`.
- La matriz no muestra que `members.list` acepta API key.
- `addMember` ignora los grupos si el invitado ya es miembro.
- Las IPv4 mapeadas a IPv6 no pasan el CIDR.

**Plataforma**

- Las `HttpException` no salen como Problem Details.
- `WEB_ORIGINS` no se valida como URL.
- `Deadline.toAbortSignal()` no tiene uso y deja un temporizador.
- `CursorCodec` no recibe secreto en ningún servicio.
- Hay dos implementaciones de SigV4, una escrita a mano.
- `RateLimitGuard` y `@RateLimit` no tienen uso y sus llaves ya divergen.
- Las versiones de caché no tienen TTL.
- `CacheModule.forFeature` tapa el `Clock` y el `IdGenerator` globales.
- Hay `new SystemClock()` por defecto dentro de clases.
- El export de contratos ignora los `refine` y acepta `retry` sin `idempotent`.
- `exclusive` no garantiza una corrida por ocurrencia de cron.
- El `SKIP LOCKED` del saga store corre en una transacción que confirma al leer.
- El HMAC interno es un solo secreto compartido por todos los servicios.

**Arquitectura**

- `86_400_000` aparece como número mágico en cuatro sitios.
- `OptimisticLockError` recibe literales.
- La búsqueda lanza `throw new Error` sin código.
- `clock ?? new SystemClock()`.
- `useValue: new ...` dentro de `forRoot`.
- `TimerScheduler` estático.
- `peerContracts` está duplicado en reports.
- CLAUDE.md dice que los generadores "llegan en F11", y las skills no los mencionan.

**Front**

- `AccessRule([])` solo se rechaza con `assert`: en release permite todo.
- Abrir /login con sesión crea otra sin revocar la anterior.
- `HandshakeException` no se envuelve como error de transporte.
- El assistant consume efectos dentro de `build` y muta su estado.
- `SignInFlow` recibe una clase concreta.
- Hay exports sin `show`.
- El UUID se genera con `Random()`.
- El botón de reintento no tiene semántica.
- `params ?? ''` esconde un parámetro faltante.
- La documentación de auth está en español.

**Infraestructura**

- Las pruebas de infra comparan texto: el pinning revisa 3 de 6 workflows y usan prefijos cortos.
- ECR se crea por CLI sin política de ciclo de vida.
- `service-catalog.mjs` reimplementa HCL.
- La imagen base no está fijada por digest y no hay `.dockerignore`.
- El `.tfplan` con secretos queda en disco si el apply falla.
- CloudFront no tiene access logs.

---

## 4. Pruebas que no prueban comportamiento real

Lo bueno: en todo el repositorio no hay `jest.fn`, snapshots ni aserciones sobre llamadas, y abundan las pruebas de contrato contra adaptadores reales. El problema es lo que queda sin probar y los dobles que copian el defecto.

- **Billing y reports casi sin pruebas de aplicación.** Billing tiene 0 pruebas unitarias de sus 10 casos de uso, y reports tiene una. En archivos de prueba frente a código: identity 83/437, billing 9/126, reports 5/85. Todo depende de int-spec que se saltan sin Docker. Ningún caso de doble cobro, write skew, reactivación o desorden está probado.
- **Identity sin specs de sus casos críticos.** No hay specs de `SignInWithPassword`, `RefreshSession`, `VerifyMfa`, `StepUp`, `PasskeyAuthentication` ni `ConfirmPasswordReset`. Varias specs prueban los propios fakes (`in-memory-*.facade.spec.ts`), y el fake de devices copia el reconocimiento defectuoso. El autenticador de prueba siempre marca UV.
- **Un solo tenant por shard.** Las pruebas de sharding siembran siempre un tenant por shard, justo el caso que esconde las dos fuentes de tenant y la transacción con otro tenant. El cambio de instancia solo se prueba en secuencia.
- **Traslado sin escrituras concurrentes.** Los ensayos de traslado siembran 2 filas y nunca escriben durante la copia. Los ayudantes repiten `RoundPending` sin límite, lo que esconde el tope de 20. No hay una prueba de la saga real contra los participantes.
- **Pruebas que no pasan por el camino real.** `triggers.consumer.spec.ts` no pasa por el dispatcher, y por eso no ve el bloqueante B5. `realtime-control.consumer.spec.ts` solo verifica llamadas. "Does not send twice" es secuencial.
- **Jobs.** "Does not overlap a hung run" nunca llega al timeout, y `HUNG_JOB` coopera con el aborto, a diferencia de los jobs reales.
- **Front.** Los transportes falsos ignoran los headers y ninguna prueba navega de un id a otro, así que B21 y B22 pasan en verde.
- **Infraestructura.** Las pruebas comparan texto. Los prefijos cortos esconden el truncado de B18, y no hay una prueba de humo que arranque la imagen (B17).
- **Pruebas triviales.** `structural-doubles.spec.ts`, `public-api.spec.ts` y `fake-rate-limiter.spec.ts` prueban tipos o dobles.

---

## 5. DI, hexagonal, clean code, SOLID, composición, reutilización y organización

**Lo que se cumple:**

- `check-structure --all` pasa.
- Ningún `domain/` importa infraestructura.
- Los puertos son clases abstractas sin decoradores, y el cableado de Nest vive en `src/nest`.
- La plataforma elige adaptadores con clases selectoras probadas (`FlagStoreSelector`, `SearchIndexFactory`, `TenantDataTransferSelector`).

**Lo que se rompe, por principio:**

- **Inyección de dependencias:**
  - `new` de colaboradores dentro de clases (`CursorCodec`, `BatchTenantDataTransfer`, `new SystemClock()` por defecto).
  - Elección de adaptador en `switch` dentro de `useFactory`.
  - `AppConfig.root<X>()` en la capa de aplicación.
  - Módulos que tapan providers globales.
- **Hexagonal:**
  - TypeORM (`DataSource`) en puertos y en `application/` de tenant-move.
  - `HttpProblemError` en la aplicación de access (ya corregido en identity).
  - Handlers de presentación que orquestan repositorios ajenos.
- **SOLID:**
  - Clases `Manage*` con varios casos de uso, que rompen la responsabilidad única.
  - Fachadas que son además casos de uso.
  - Autorización repartida entre controlador y caso de uso.
  - `GrantablePermissions` duplica `ActorPermissions`.
- **Composición:** 15 módulos de negocio `@Global()` en identity, con ciclos rotos por `ModuleRef`. Identity es la referencia, así que se copia.
- **Dominio:** access es anémico, y no hay ni un uso de eventos de dominio en el repositorio, contra la skill backend-dominio.
- **Reutilización:**
  - `TenantShard` copiado cinco veces.
  - Cinco test apps.
  - Cursores en tres formas.
  - Cuatro variantes de "quién actúa".
  - Dos bases de repositorio, una sin uso.
  - `RateLimitGuard` sin uso.
  - Dos implementaciones de SigV4.
  - Caché propio en cuotas.
- **Organización:** `@Injectable` dentro de `shared/utils`, y fakes de puertos de plataforma viviendo en apps.

**Arreglo de fondo:** un ciclo dedicado a extraer a la plataforma `ShardScopes`, `ActingMember`, `IdCursor` y `ServiceTestApp`, y a reemplazar los `switch` de `useFactory` por selectores. Además, decidir en un ADR si los módulos `@Global` y el dominio sin eventos son la regla, y si lo son, corregir las skills.

---

## 6. Comentarios de relleno

No hay comentarios que citen olas, tareas ni el plan, y casi todos explican el porqué. Cerca del 10 % de los ~865 bloques JSDoc repiten el nombre. Ejemplos:

- "Lo que `plans` ofrece a los otros módulos" (`plans.facade.ts:3`), la misma frase en siete fachadas.
- "`AccessFacade` dentro del proceso" (`local-access.facade.ts:13`).
- "Valores por defecto de tasks" (`tasks-defaults.constants.ts:1`).
- "Creates the builder." (`front/packages/ui/lib/src/state/controller_builder.dart:7`).

Más grave que el relleno son los comentarios **engañosos**, porque dan por resuelto lo que no lo está:

- El apagado "deja de aceptar y espera" (`service-bootstrap.ts:35`).
- `runInContext` "por ejemplo para abrir una transacción" (no existe ese contexto).
- La saga en transacción "se devuelve en `Running`".
- "Primer periodo pagado" (`subscription.ts:51`), cuando se cobra al final.
- El login "con el mismo costo" para un email existente o no.
- `.env.example:32`: Lambda "lo lee al arrancar".
- `health-registry.ts:13`: los endpoints de salud "son de `@platform/http`".

---

## 7. Decisiones de los ADR que no convencen

- **ADR 0020, tiempo real tras un ALB público.** Saltarse API Gateway se justifica, pero no saltarse CloudFront y WAF, que soportan WebSocket y SSE. Hoy es la única entrada pública sin WAF.
- **ADR 0020, "los servicios salen solo por HTTPS".** Es incompatible con la API interna síncrona y no define cómo se descubre otro servicio. Hace falta una decisión explícita de Service Connect o Cloud Map con su regla de red.
- **ADR 0020, workers desde cero con Spot.** Para colas de consistencia (la proyección de acceso) conviene `min_capacity = 1` y sin Spot.
- **ADR 0021, SigV4 propio.** Reimplementar una firma criptográfica teniendo `@smithy/signature-v4` instalada es justo el caso en que reimplementar es imprudente.
- **ADR 0021, el Bloom "nunca queda vacío".** Es cierto, pero pierde elementos durante la reconstrucción. Además, para menos de 2.000 contraseñas filtradas, un Set en memoria es más simple y no depende de la red.
- **ADR 0023 y 0024, idempotencia en el catálogo con `complete` no atómico.** Toda la corrección depende de que cada operación sea idempotente por su entrada. Conviene dos fases: el resultado en el shard destino, dentro de la transacción del handler, y en el catálogo solo la ruta.
- **ADR 0024, réplica por defecto sin consistencia de sesión.** No hay "leer lo que acabo de escribir" ni para los datos ni para el directorio. **Propuesta:** el LSN del último commit, o un primario pegajoso por unos segundos.
- **ADR 0024, RDS Proxy con candados de sesión.** Choca con la barrera de traslado. Hay que elegir antes de desplegar.
- **ADR 0026, `exclusive`.** Garantiza exclusión mutua, no una corrida por ocurrencia. Debe decir que los jobs exclusivos igual tienen que ser idempotentes.
- **ADR 0027, `ControllerBuilder` sin entradas.** Obliga a cada pantalla a recordar una llave, y tres no lo hicieron.
- **ADR 0027, `StepUpGate` en account.** El step-up es transversal y debe vivir en shell_core.
- **ADR 0027, `ShellMode` global.** Es todo o nada: para conectar billing a la API real, todos los demás deben tener ya su adaptador.
- **ADR 0028, revocación asíncrona.** Confía la revocación a un camino asíncrono sin respaldo. Además, la tabla 2.1 del diseño y el ADR describen distinto la cookie de tiempo real.
- **ADR 0029, mantenimiento entre tenants.** No define qué hacer con un resultado parcial, y eso permite reportar como hecho un borrado de datos personales incompleto.
- **ADR 0030, líneas omitidas en plantillas.** Omitir una línea con un dato faltante solo tiene sentido para los parámetros opcionales.
- **ADR 0031, numeración de facturas por tenant.** El emisor es uno solo, y la numeración choca con la contabilidad y con la factura electrónica.
- **ADR 0031, cobro al cierre sin medio de pago en la prueba.** Deja unos 51 días gratis con una tarjeta mala.
- **ADR 0031, "sin facturas a favor".** Es falso mientras los precios sean editables.
- **ADR 0031, usuarios contados el día del cierre.** Permite bajar la factura quitando miembros la víspera.
- **ADR 0031, borrado del único dueño.** El borrado de cuenta no protege al único dueño.
- **ADR 0032, región que se entera al vencer el caché.** Produce el rebote de 421 entre regiones.
- **ADR 0032, gracia de 0 días.** Abre una ventana sin barrera.
- **ADR 0033, seis ediciones manuales tras generar.** `MarkedFile` ya existe. La edición crítica es `TenantMoveParticipants.ALL`.
- **Diseño de F4, un solo `IDENTITY_TOKEN_PEPPER` sin versión.** Deriva todo, así que rotarlo invalida todas las sesiones y los códigos de recuperación. **Propuesta:** subllaves por propósito con HKDF y un `kid`.

---

## 8. Lo que está bien hecho y conviene conservar

- **Router de shards.** Hace una carga única por tenant y usa lápidas con versiones pares e impares y compare-and-set en Lua: una carga que coincide con una invalidación nunca se guarda en caché.
- **Barrera de traslado.** Toma el candado compartido antes de `BEGIN`, separa la barrera (la garantía) de la compuerta (la señal) y cierra la conexión si el unlock falla. La reconciliación por tramos con checkpoints está bien pensada.
- **Fencing en todo el núcleo.** Token y versión en sagas, lease con `SKIP LOCKED` y predecesores FIFO en el outbox, y claims de tres estados.
- **Motor de sagas.** Escribe la intención antes de llamar y separa con claridad éxito, negocio, transitorio, incierto y violación de protocolo.
- **Verificador de tokens.** Fija el algoritmo y exige `typ`, `iss`, `aud`, `exp` e `iat`. Rechaza `crit`, y el JWKS solo acepta P-256.
- **Sesiones.** La rotación con HMAC por generación usa `FOR UPDATE`. Los usos únicos se resuelven con `GETDEL` y `WHERE used_at IS NULL`, y la cookie es `__Host-` con `SameSite=Strict`.
- **Acceso.** `GrantCeiling` aplica "quitar también cuenta", `lockForChanges` cierra la carrera del último dueño y el RLS está forzado con `nullif`.
- **Dinero.** Siempre en enteros de unidad menor, con prorrateo telescópico. Factura, consecutivo y cierre van en una sola transacción, y la ingesta de uso es idempotente.
- **Plataforma base.** `Deadline`, `PolicyExecutor` y `Bulkhead` están cuidados. El limitador deslizante da lo mismo en TS y en Lua, y Problem Details usa una lista blanca de detalles.
- **Tiempo real.** Tiene un contrato común para SSE y Socket.IO probado con dos instancias, y las plantillas de correo escapan el HTML.
- **Front.** La sesión tiene un solo refresh en vuelo, generaciones y una cola de escrituras. Los controladores se prueban sin widgets, `ApiClient` valida contra el contrato y las fronteras entre microfrontends las vigila un script.
- **CI.**
  - Las acciones están fijadas por SHA, no hay `pull_request_target` y los permisos se declaran por job.
  - Todo va cifrado con CMK y los logs tienen retención.
  - RDS en prod es multi-AZ con protección de borrado.
  - Los secretos de Terraform son efímeros y de solo escritura.

---

## 9. Orden recomendado

### Antes de F12: dos ciclos de corrección

**Ciclo 1: dinero, datos y seguridad.** Del B1 al B16, más estos importantes:

- el tope de suspensiones de la saga de traslado;
- el `abort` que abre al final;
- la revocación en el latido del tiempo real;
- el correo duplicado;
- el borrado de datos personales incompleto;
- la autorización de invitaciones y el MFA reciente;
- el escalón de límite en invitaciones, cambio de email y creación de tenants;
- el redactor de logs;
- el timeout HTTP que duplica POST.

Ninguno depende de la infraestructura.

**Ciclo 2: estructura.**

- Extraer a la plataforma `ShardScopes`, `ActingMember`, `IdCursor` y `ServiceTestApp`.
- Elegir una sola base de repositorio.
- Selectores en lugar de `useFactory` con `switch`.
- Pruebas unitarias de aplicación en billing, reports e identity con los escenarios de la sección 4.
- Decidir `@Global` y los eventos de dominio en un ADR.
- `generators:verify` y `check-structure` en CI.

### F12, en este orden

1. **Que el artefacto arranque (B17).** Imagen con dependencias, `main.mjs`, comando de workers, ARM64 y una prueba de humo en CI.
2. **Red y secretos (B19 y B20).** Service Connect con `INTERNAL_API_BASE_URLS`, regla de red interna, secretos de la app creados en Terraform, `WEB_ORIGINS` y la lectura de secretos en Lambda.
3. **Catálogo global y variables de región.** `REGIONS`, `SERVICE_REGION` y `TENANT_MOVE_*`, con los nombres de las variables de base de datos alineados con el código.
4. **Configuración versionada coherente.** `fargate_api_enabled`, el certificado de tiempo real, nombres de target group sin choque (B18), quitar `fake` de prod y un `terraform test` que planee los tfvars reales.
5. **Valkey obligatorio fuera de desarrollo** y `NODE_ENV` o `DEPLOY_ENVIRONMENT` como fuente de las protecciones de producción.
6. **Decisión RDS Proxy frente a la barrera,** y rotación de credenciales con autenticación IAM.
7. **Endurecer el pipeline.**
   - OIDC con `job_workflow_ref`.
   - Plan revisado antes de aplicar.
   - Deploy después de CI.
   - Keystore en un environment protegido.
   - Caché correcta de la web.
   - CloudFront y WAF delante del tiempo real.
