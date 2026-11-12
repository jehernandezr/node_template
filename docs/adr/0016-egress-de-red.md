# 0016. Salida a Internet con NAT solo para las subredes de aplicación

- Estado: Aceptada
- Fecha: 2026-11-12

## Contexto

La primera versión de la red no tenía NAT: los servicios llegaban a AWS por endpoints de VPC y nada más. Eso bloquea llamadas que la plataforma necesita: la API de Claude (ADR 0013), APNs, FCM y los proveedores de pago. A la vez, la base de datos y la caché no deben tener nunca una ruta a Internet.

## Decisión

La VPC tiene tres niveles de subred en dos zonas de disponibilidad: públicas, privadas (aplicación) y de datos. La variable `egress` del módulo `network` fija la salida de las privadas:

| Valor        | NAT gateways         | Uso  |
| ------------ | -------------------- | ---- |
| `none`       | Ninguno              | Entornos sin llamadas externas |
| `single_nat` | Uno, en la primera AZ | dev |
| `per_az_nat` | Uno por AZ           | prod |

- Las subredes privadas tienen una tabla de rutas por AZ con ruta `0.0.0.0/0` al NAT. Con `single_nat` ambas usan el mismo.
- Las subredes de datos (RDS, RDS Proxy, Valkey y las lambdas de administración de la base) no tienen ruta por defecto. Solo llegan a AWS por endpoints.
- Se mantienen los endpoints de VPC: gateway para S3 y DynamoDB; interfaz para SQS, SNS, Secrets Manager, KMS, ECR (api y dkr), Logs, STS y CloudWatch. El tráfico a AWS no pasa por el NAT.
- El security group `clients` solo abre HTTPS (443) hacia Internet cuando `egress` no es `none`. Los servicios no reciben otros puertos de salida.
- La salida usa IPs elásticas fijas, publicadas en la salida `nat_public_ips` para las listas de permitidos de los proveedores.
- Los flow logs de la VPC van a CloudWatch Logs con una clave KMS propia y retención configurable, para auditar lo que cruza el NAT y lo que se rechaza.

## Consecuencias

Positivas:

- Los servicios llaman a Claude, APNs, FCM y pagos sin cambiar de red.
- Un compromiso de la base de datos o la caché no abre una vía de exfiltración directa a Internet.
- Con `per_az_nat`, la caída de una AZ no corta la salida de la otra.

Costos (precios de referencia en us-east-1, revísalos antes de decidir):

- Cada NAT gateway cuesta cerca de 33 USD al mes más 0,045 USD por GB procesado. Prod con dos paga unos 65 USD fijos; dev con uno, unos 33 USD.
- Los endpoints de interfaz cuestan cerca de 7 USD al mes por AZ y endpoint, y compensan el NAT para el tráfico hacia AWS.
- Los flow logs con tráfico `ALL` suman costo de ingestión; dev usa `REJECT`.
- `per_az_nat` evita además el tráfico entre zonas hacia un único NAT.

## Alternativas consideradas

- Sin NAT y con un proxy de salida propio: más piezas que operar y sin ventaja clara.
- Salida directa con IP pública en las subredes de aplicación: expone los servicios y no da IP fija de salida.
- NAT instance: más barata, pero sin alta disponibilidad administrada y con mantenimiento propio.
- Un solo NAT en prod: ahorra 33 USD al mes pero deja la salida atada a una AZ.
