"""Crea los usuarios de servicio de PostgreSQL a partir de secretos de Secrets Manager.

Idempotente: si el rol ya existe no toca su contraseña (la rotación es dueña de ella).
Se conecta con el usuario maestro administrado por RDS, solo desde dentro de la VPC.
"""

import json
import os
import ssl

import boto3
import pg8000.native as pg

sm = boto3.client("secretsmanager")


def _secret(arn):
    return json.loads(sm.get_secret_value(SecretId=arn)["SecretString"])


def _connect(host, port, dbname, master):
    # rds.force_ssl=1 obliga a TLS. La conexión es interna a la VPC, así que se cifra sin
    # verificar la cadena (el bundle de RDS no viene en el runtime de Lambda).
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return pg.Connection(
        user=master["username"],
        password=master["password"],
        host=host,
        port=int(port),
        database=dbname,
        ssl_context=ctx,
        timeout=30,
    )


def handler(event, _context):
    master = _secret(event["master_secret_arn"])
    dbname = event["dbname"]
    conn = _connect(event["host"], event["port"], dbname, master)
    created, existing = [], []
    try:
        for ext in event.get("extensions", []):
            conn.run(f"CREATE EXTENSION IF NOT EXISTS {pg.identifier(ext)}")

        for user in event["users"]:
            name = user["name"]
            ident = pg.identifier(name)
            exists = conn.run("SELECT 1 FROM pg_roles WHERE rolname = :n", n=name)
            if exists:
                existing.append(name)
            else:
                password = _secret(user["secret_arn"])["password"]
                conn.run(
                    f"CREATE ROLE {ident} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE "
                    f"NOBYPASSRLS PASSWORD {pg.literal(password)}"
                )
                created.append(name)

            # El maestro debe poder asumir el rol para crear esquemas a su nombre (PG16+).
            conn.run(f"GRANT {ident} TO {pg.identifier(master['username'])}")
            conn.run(f"GRANT CONNECT ON DATABASE {pg.identifier(dbname)} TO {ident}")

            schema = user.get("schema")
            if schema:
                sch = pg.identifier(schema)
                conn.run(f"CREATE SCHEMA IF NOT EXISTS {sch} AUTHORIZATION {ident}")
                conn.run(f"ALTER ROLE {ident} SET search_path = {sch}, public")

            if user.get("rds_replication"):
                conn.run(f"GRANT rds_replication TO {ident}")
    finally:
        conn.close()

    print(json.dumps({"created": created, "existing": existing}))
    return {"created": created, "existing": existing}
